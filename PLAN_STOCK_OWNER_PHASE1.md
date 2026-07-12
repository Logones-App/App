# Plan d'implémentation — stock_owner Phase 1 (mode A)

_Contrat complet + décisions dans `SPEC_CURRENT_STOCK_OWNERSHIP.md`. Ce fichier = plan de code exécutable._

## ÉTAT (2026-07-12) : Phase 1 + Phase 2 CODÉES + SQL DÉPLOYÉ ✅
- SQL déployés : `establishments.stock_owner` (défaut 'pos'), `doc_import_lines.movement_type`,
  garde `reference_type='doc_import'` dans `fn_snapshot_purchase_price`.
- **Phase 1** (#1/#2/#3) : réception manuelle + OCR → prix immédiat + stock en delta ; badge « en attente » ;
  filtre inbox. Fait.
- **Phase 2** : edit/delete réception appliquée → ajustement signé (`emitAdjustmentDelta`,
  `movement_type='adjustment'`) ; UI edit/delete toujours dispo en 'pos' ; helpers extraits dans
  `reception-delta.ts`. Fait.
- **Suppression d'une réception en attente** (`useDeletePendingReception`, `pending-reception-queries.ts`) :
  retire ligne + doc_import + snapshot lié + reprice. Fait.
- tsc/eslint 0 erreur. **Prêt à committer (tout en une fois, à la fin).**
- POS prêt (Phase 1 + 2). **Reste : cycle test conjoint (scénarios 1-4).**
- Non fait (suivi mineur) : ÉDITION d'une réception en attente (delete+recreate suffit) ; le prix reste
  géré via le flux prix pour un edit 'pos' d'une réception appliquée (ajustement = stock seul).

## Objectif

En établissement `stock_owner='pos'` (tout le parc), le SaaS **n'écrit jamais `current_stock`**.
Il **émet** : le **stock** en delta via `doc_imports` (le POS applique) et le **prix** en snapshot
**immédiat** (owned SaaS → marge en direct). Mode A = validation humaine sur le POS.

## Contrat verrouillé (rappel)

- **Stock** : `doc_import_line` avec `quantite` en **unité de commande** + `supplier_reference_id`.
  Le POS calcule `stockQty = quantite × supplier_reference.conversion_factor`. `apply_stock=true`,
  `applied_at=NULL`. `contenance_unitaire` n'est plus le facteur.
- **Prix** : snapshot SaaS immédiat (`supplier_price_snapshots`) + MAJ `supplier_references.unit_price` ;
  lien `source_doc_import_id = <doc_import.id>`. Le trigger `fn_snapshot_purchase_price` **skippe**
  les mouvements `reference_type='doc_import'` (garde ci-dessous) → pas de double snapshot.
- **Date FIFO** : le POS pose `created_at = doc_imports.date_livraison` sur le mouvement (option ii,
  zéro SQL FIFO).
- **unit_cost mouvement** (POS) : `doc_import_line.prix_unitaire ÷ conversion_factor`, repli sur
  `supplier_references.unit_price ÷ conversion_factor`.
- **Fiche stock** : le POS crée `product_stocks` via `ensure_self_stock` à l'application. Le SaaS
  ne crée **pas** `product_stocks`/`product_compositions` en `'pos'`.
- **Back-link** : le POS pose `reference_type='doc_import'` + `reference_id=doc_import_line.id` +
  `applied_at` → le SaaS retire le badge « en attente ».

## SQL à déployer (complet, à passer dans le SQL Editor — coordonné avec la Phase 1)

### 1. Colonne stock_owner — DÉJÀ FAIT ✅
```sql
alter table public.establishments
  add column if not exists stock_owner text not null default 'pos'
  check (stock_owner in ('pos','saas'));
```

### 2. Garde `reference_type='doc_import'` dans le trigger de snapshot (fonction ENTIÈRE)
```sql
CREATE OR REPLACE FUNCTION public.fn_snapshot_purchase_price() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_factor numeric; v_supplier_id uuid; v_order_unit text; v_unit_price numeric;
BEGIN
  -- Prix owned SaaS pour les mouvements issus d'un doc_import (OCR + réception manuelle) :
  -- le SaaS a déjà posé le snapshot → on n'en refait pas un ici (évite le double).
  -- Corrige aussi le double-snapshot latent du chemin OCR (snapshot explicite + trigger).
  IF NEW.movement_type <> 'purchase'
     OR NEW.deleted
     OR NEW.supplier_reference_id IS NULL
     OR NEW.unit_cost IS NULL
     OR NEW.reference_type = 'doc_import' THEN
    RETURN NEW;
  END IF;

  SELECT conversion_factor, supplier_id, order_unit
    INTO v_factor, v_supplier_id, v_order_unit
    FROM supplier_references WHERE id = NEW.supplier_reference_id;

  v_unit_price := NEW.unit_cost * COALESCE(NULLIF(v_factor, 0), 1);

  UPDATE supplier_references SET unit_price = v_unit_price WHERE id = NEW.supplier_reference_id;

  INSERT INTO supplier_price_snapshots(
    product_id, organization_id, supplier_reference_id, supplier_id,
    unit_cost, unit_price, order_unit, currency, effective_from, created_by
  ) VALUES (
    NEW.product_id, NEW.organization_id, NEW.supplier_reference_id, v_supplier_id,
    NEW.unit_cost, v_unit_price, v_order_unit, 'EUR', NEW.created_at, NEW.created_by
  );

  RETURN NEW;
END; $$;
```

### 3. Colonne movement_type — À PASSER MAINTENANT (débloque le POS en parallèle)
Nullable, `NULL`=purchase, rétro-compatible, sans effet sur la Phase 1. Le POS l'attend pour coder
son ingestion d'ajustement (lire `movement_type`, autoriser les quantités négatives).
```sql
alter table public.doc_import_lines
  add column if not exists movement_type text
  check (movement_type is null or movement_type in ('purchase','adjustment'));

comment on column public.doc_import_lines.movement_type is
  'Type de mouvement pour l''ingestion POS : NULL ou ''purchase'' = réception (quantite ≥ 0) ; ''adjustment'' = correction (quantite signée +/-, pas de snapshot prix). Voir SPEC_CURRENT_STOCK_OWNERSHIP.md.';
```
Régénérer `database.types.ts` après.

## Découpage code

### Fondation — FAIT ✅
- `establishments-queries.ts` : hook `useEstablishmentStockOwner` (défaut `'pos'`). Nettoyer le cast
  défensif (types régénérés).

### #1 — Réception manuelle en `'pos'` (`reception-queries.ts` + modale)
`useCreateReception` branché sur `stock_owner` :
- `'saas'` → comportement actuel (mouvement + `current_stock`).
- `'pos'` :
  1. **Prix immédiat** (si prix saisi) : insert `supplier_price_snapshots`
     (`unit_cost = unitPrice/factor`, `unit_price = unitPrice × … ` cohérent, `supplier_reference_id`,
     `product_id`, `source_doc_import_id`, `effective_from`) + `UPDATE supplier_references.unit_price`.
  2. **Stock différé** : `insert doc_imports` (parent finalisé : `establishment_id`, `organization_id`,
     `supplier_id`, `date_livraison`=date réception, `doc_type='saas_reception'`) puis
     `insert doc_import_lines` (`quantite`=orderQty brut, `supplier_reference_id`, `unite`=order_unit,
     `prix_unitaire`=unitPrice, `apply_stock=true`, `apply_price=false`, `applied_at=NULL`,
     `automation_status='matched'`).
  3. **Ne pas** appeler `ensureSelfStock`, **ne pas** écrire `stock_movements`/`product_stocks`.
- La modale passe `stockOwner` à la mutation.

### #2 — OCR en `'pos'` (`doc-import-lines-queries.ts`)
`useApplyDocLine` branché sur `stock_owner` :
- `'saas'` → comportement actuel.
- `'pos'` → **snapshot prix immédiat** (idem #1, + `source_doc_import_id=importId`), **pas** de stock,
  **pas** de `applied_at`, **pas** de rescale d'unité, **pas** de `ensureSelfStock`. On laisse la ligne
  au POS (elle est déjà `apply_stock≠false` + `applied_at=NULL`).

### #3 — UX « en attente » + intégration
- Historique réception (`product-dashboard-reception-history.tsx`) : afficher aussi les
  `doc_import_lines` non appliquées (badge « en attente validation caisse »), corrélées via
  `reference_id`/`applied_at` (une fois appliquées → le mouvement apparaît, badge retiré).
- Filtrer les `doc_imports` `doc_type='saas_reception'` hors de l'inbox OCR.
- Câbler `useEstablishmentStockOwner` dans la modale réception + l'UI doc-import + l'historique.

### Phase 2 (après dev POS) — edit/delete en `'pos'`
- SQL colonne `movement_type` (ci-dessus).
- `useUpdateReception`/`useDeleteReception` en `'pos'` → ligne d'ajustement signée
  (`movement_type='adjustment'`, `quantite` signée, `supplier_reference_id`, pas de snapshot).
- En attendant : désactiver edit/delete en `'pos'` (tooltip « correction via la caisse »).

## Séquencement de déploiement
1. SQL #2 (garde trigger) — déployable dès maintenant (corrige le double OCR ; sans effet tant que
   le SaaS snapshotte déjà ses OCR, ce qu'on branche en #1/#2).
2. Code #1 + #2 + #3 + hook nettoyé → build vert → commit.
3. Côté POS (non bloquant pour notre code) : `created_at=date_livraison` + repli `unit_cost`.
4. Bascule réelle : établissements restent `'pos'` (défaut) — la Phase 1 les route automatiquement.
5. Cycle test conjoint SaaS→POS (pas de double-compte, badge se résout).
