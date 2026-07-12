# Guide de test — stock_owner='pos' (réceptions en deltas, mode A)

_Cycle test conjoint SaaS ↔ POS. Contrat : `SPEC_CURRENT_STOCK_OWNERSHIP.md`. Code : `PLAN_STOCK_OWNER_PHASE1.md`._

## Prérequis
- SQL déployés : `establishments.stock_owner` (défaut `'pos'`), `doc_import_lines.movement_type`,
  garde `reference_type='doc_import'` dans `fn_snapshot_purchase_price`.
- Un **établissement** en `stock_owner='pos'` (tout le parc l'est par défaut).
- Un **produit** avec une **référence fournisseur** au `conversion_factor` correct (ex. sac de 10 kg, ou kg→g=1000).
- Une **caisse POS** appairée sur l'établissement (pour valider les lignes).

Vérifier l'ownership :
```sql
select id, name, stock_owner from public.establishments where deleted = false order by name;
```

---

## Scénario 1 — Réception (Phase 1)

**Action SaaS** : fiche produit → onglet Réceptions → **Nouvelle réception** → saisir quantité (unité de
commande) + prix → valider.

**Attendu côté SaaS (immédiat)** :
- Toast « Réception enregistrée ».
- **Prix/marge à jour tout de suite** : l'historique de prix d'achat a une nouvelle entrée ; le food cost bouge.
- Dans l'historique réception : une ligne **« En attente de validation caisse »** (badge ambre).
- **`current_stock` inchangé** (aucun mouvement SaaS).

**Vérif SQL (avant validation caisse)** — un doc_import synthétique + sa ligne + 1 snapshot, zéro mouvement :
```sql
-- doc_import synthétique + ligne à appliquer
select di.id, di.doc_type, di.date_livraison, dil.quantite, dil.unite, dil.prix_unitaire,
       dil.apply_stock, dil.applied_at, dil.movement_type
from doc_imports di join doc_import_lines dil on dil.import_id = di.id
where di.doc_type = 'saas_reception' order by di.created_at desc limit 5;
-- attendu : apply_stock=true, applied_at NULL, movement_type NULL

-- 1 snapshot lié à la livraison
select id, unit_cost, unit_price, source_doc_import_id from supplier_price_snapshots
where source_doc_import_id is not null order by created_at desc limit 5;

-- AUCUN mouvement de stock encore pour ce produit (créé par le POS seulement)
```

**Action POS** : valider la ligne en caisse.

**Attendu après validation** :
- Le POS crée le `stock_movements` (`reference_type='doc_import'`, `created_at = date_livraison`), pose `applied_at`.
- SaaS : le badge « en attente » **disparaît**, la réception apparaît dans le tableau ; `current_stock` (côté POS) a bougé.
- **UN SEUL snapshot** pour cette réception (pas de double grâce à la garde trigger).

**Vérif SQL (après validation)** :
```sql
-- le mouvement existe, daté de la réception
select id, movement_type, reference_type, quantity, unit_cost, created_at
from stock_movements where reference_type = 'doc_import' order by created_at desc limit 5;

-- PAS de double snapshot : 1 seule ligne par source_doc_import_id
select source_doc_import_id, count(*) from supplier_price_snapshots
where source_doc_import_id is not null group by source_doc_import_id having count(*) > 1;
-- attendu : 0 ligne (aucun doublon)

-- pas de drift
select * from v_stock_reconciliation where has_drift = true;
-- attendu : 0 ligne pour ce produit
```

---

## Scénario 2 — Ajustement négatif (correction d'une réception)

**Action SaaS** : sur une réception **déjà appliquée** (dans le tableau), **✏️ Modifier** vers la **bonne
quantité totale** (ex. « je pensais avoir reçu 10, en fait 8 » → saisir 8, **pas de « moins » à taper** : le
système envoie le delta −2) OU **🗑️ Supprimer** = retirer *cette* réception entière.
Ces corrections sont **liées à la réception**. Un négatif qui passerait `current_stock` sous zéro est
**appliqué tel quel** (pas de plafond = signal à réconcilier).

> ⚠️ Un mouvement négatif **sans rapport** avec une réception (perte, casse, inventaire) **ne** passe **pas**
> par l'édition d'une réception — c'est le rôle du flux **« Variations de stock »** (séparé, à câbler en `'pos'`).

**Attendu** : émission d'une ligne `doc_import` `movement_type='adjustment'`, `quantite` **négative**
(unité de commande), **pas de snapshot**. En 'pos', l'action est **toujours dispo** (même lot entamé par des ventes).

**Vérif SQL** :
```sql
select dil.quantite, dil.movement_type, dil.apply_stock, dil.applied_at
from doc_import_lines dil join doc_imports di on di.id = dil.import_id
where dil.movement_type = 'adjustment' order by di.created_at desc limit 5;
-- attendu : quantite < 0, movement_type='adjustment', apply_stock=true, applied_at NULL
```

**Action POS** : valider → **déplétion FIFO** du -delta (sans clamp, peut passer sous zéro = signal).

---

## Scénario 3 — Ajustement positif

**Action SaaS** : **✏️ Modifier** une réception appliquée vers une quantité **plus grande**.

**Attendu** : ligne `adjustment` `quantite` **positive**. POS valide → lot valorisé au **CMP**.

---

## Scénario 4 — Offline (surtout POS)

Vente POS **hors ligne** + réception SaaS **en attente** en parallèle. Au retour de connexion : les **deux
deltas** s'appliquent, **aucun perdu** (le SaaS n'écrit jamais `current_stock`, donc pas de clobber).

---

## Test — Annulation / édition d'une réception EN ATTENTE (avant validation caisse)

Sur une réception encore « en attente » (badge) :
- **Crayon** → éditer quantité/prix inline → ✓ : met à jour la ligne (que le POS appliquera) + le snapshot lié + `unit_price`.
- **Corbeille** → confirme → retire la ligne + le doc_import + le snapshot lié + recale le prix. Aucun stock appliqué → rien à corriger.

**Vérif** : après annulation, plus de ligne `doc_import` ni de snapshot orphelin pour cette livraison.

---

## Checklist de validation conjointe
- [ ] S1 : réception → 1 delta, 1 snapshot, `created_at=date_livraison`, `has_drift=false`.
- [ ] S2 : ajustement négatif → -delta, pas de snapshot, déplétion FIFO.
- [ ] S3 : ajustement positif → lot au CMP.
- [ ] S4 : offline → deux deltas, aucun perdu.
- [ ] Annulation/édition en attente → cohérent, pas d'orphelin.
- [ ] Aucun double snapshot (requête count > 1 = 0 ligne).
