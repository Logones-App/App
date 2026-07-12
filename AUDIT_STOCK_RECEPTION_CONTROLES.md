# Audit — Contrôles réceptions / stock / conversion d'unités

_Analyse read-only (2026-07). Schéma audité : `supabase/schema_20260711.sql` (dernier dump). Les 4 fonctions et triggers ci-dessous ont été **relus directement** dans ce dump (pas seulement via l'agent)._

## Ce que font réellement les 4 fonctions/triggers stock (lecture directe, dump 07-11)

- **`fn_fifo_valorize`** (`schema:208-331`, AFTER INSERT `stock_movements`) — valorisation FIFO : pose `remaining_quantity` sur les lots `purchase`, calcule `unit_cost` des sorties par consommation FIFO/CMP. **Ne touche jamais `product_stocks.current_stock`.** Aucune validation unité/quantité.
- **`fn_snapshot_purchase_price`** (`schema:365-395`, AFTER INSERT, SECURITY DEFINER) — `v_unit_price := NEW.unit_cost * COALESCE(NULLIF(v_factor,0),1)` puis `UPDATE supplier_references.unit_price` + insert `supplier_price_snapshots`. **Fait confiance à `conversion_factor`** → un 180 erroné pollue `unit_price` **et** l'historique de prix.
- **`fn_lock_stock_unit`** (`schema:337-358`, BEFORE UPDATE `product_stocks`) — `RAISE EXCEPTION` si l'`unit` change alors qu'un lot `purchase` a `remaining_quantity > 0`. **Seul vrai garde-fou cross-client.**
- **`ensure_self_stock`** (`schema:164-202`, RPC SECURITY DEFINER) — crée la self-composition + `product_stocks` (stock 0), vérifie l'appartenance org via JWT. Provisioning ; aucun contrôle de valeur.
- **Vue `v_stock_reconciliation`** (`schema:6244-6257`) — `drift = current_stock − Σ(remaining_quantity)` + `has_drift`. **Preuve que `current_stock` n'est pas fiable** (détecteur de dérive existant, exploitable pour réparer).
- Commentaire SQL de `conversion_factor` (`schema:3978`) : **toujours** « Nombre de portions par unité de commande » → contredit le code (`unit-conversion.ts:84`).

## Verdict global

**Un seul vrai garde-fou en base ; tout le reste repose sur la bonne conduite de chaque client (SaaS **et** POS).**

Le point le plus grave : **`product_stocks.current_stock` n'est PAS maintenu par la base.** Aucun trigger ni RPC ne le recalcule à partir de `stock_movements`. Chaque client calcule lui-même `quantity_before`/`quantity_after` puis fait un simple `UPDATE product_stocks.current_stock` (`reception-queries.ts:211-215/262-266/326-330`). Les triggers qui se déclenchent à l'insert d'un mouvement ne font que la **valorisation FIFO** et le **snapshot de prix** — ils ne touchent jamais au solde. Donc le stock courant est **entièrement fait confiance au client**.

→ Concrètement, le `+99` de ta capture aurait pu être écrit par le SaaS **ou** par le POS : la base ne l'aurait rejeté dans aucun des deux cas. (Le chemin réception SaaS produit exactement ce `0,55 × 180 = 99`, donc c'est le plus probable, mais aucun niveau ne l'aurait attrapé.)

## Verdict par couche

| Couche | (i) Justesse conversion d'unités | (ii) Multi-format portions (180 g / 120 g) |
|---|---|---|
| **Validation SaaS** | **FAIBLE** — le flux « phrase » (modale réception) dérive le facteur correctement via `convertUnit`, mais l'import doc (`doc-line-create-modal.tsx:191`) est un **champ libre** ; aucune garde à la réception, `suggestConversionFactor` n'est utilisé qu'en pré-remplissage | **ABSENT** — `portion_weight` unique, aucune notion multi-format en UI |
| **Triggers / RPC DB** | **ABSENT** — pas de RPC de réception validée ; `fn_snapshot_purchase_price` **fait confiance** au facteur et **propage** l'erreur dans `unit_price` + les snapshots d'historique ; `current_stock` non maintenu en base | **ABSENT** |
| **Contraintes DB** | **FAIBLE** — seulement `conversion_factor > 0` ; `stock_movements.unit` = `text` libre nullable ; **aucun** check unité↔quantité ni `movement.unit ↔ stock.unit` ; `stock_movements_calculation_check` ne vérifie que `after = before + qty` (auto-cohérent, jamais comparé au vrai solde) | **ABSENT** — `portion_weight` mono-valué (`schema:3673`) |
| **RLS / exposition POS** | **ABSENT (comme contrôle d'intégrité)** — cadrage org/établissement seulement ; DML complet accordé à `anon`/`authenticated` sur `stock_movements`, `product_stocks`, `supplier_references` ; aucune validation de valeur | **ABSENT** |

**Seul garde-fou solide et cross-client** : le verrou d'unité `fn_lock_stock_unit` (`schema:337-358`, trigger `trg_lock_stock_unit`) qui empêche de changer l'unité de stock tant qu'un lot d'achat FIFO a `remaining_quantity > 0` (« soldez le stock… »). C'est le seul contrôle réellement imposé par la base.

## Les 3 trous concrets

1. **`conversion_factor` sans validation dimensionnelle.** `CHECK (> 0)` seulement. Rien ne vérifie qu'il vaut `convertUnit(1, order_unit, stock_unit)` (1000 pour kg→g). La porte d'entrée du mauvais `180` = l'import doc (champ « unités par colis » libre). Le commentaire SQL (`:3944`, « portions par unité de commande ») **contredit** le code (`unit-conversion.ts:84`, « unités de stock par unité de commande ») → contrat ambigu même sur le papier.
2. **`current_stock` non recalculé en base.** Aucune source de vérité serveur ; le solde peut diverger silencieusement selon le client qui écrit.
3. **Aucune cohérence d'unité sur les mouvements.** `stock_movements.unit` est du texte libre ; un mouvement peut être écrit dans une unité ≠ celle du stock sans rejet.

## Le vrai besoin métier : découpler conversion et format

Ton cas « steaks 180 g **et** 120 g » n'est **pas représentable** aujourd'hui : `products.portion_weight` est **unique**, et `supplier_references` n'a **aucune** colonne de portion. Le modèle actuel **mélange deux notions distinctes** dans le seul `conversion_factor` :

- **(A) Conversion unité de commande → unité de stock** : kg → g = **1000**. Invariable, purement dimensionnel.
- **(B) Format de portion** : un steak de 180 g ou de 120 g. **Multi-valué**, sert à la production/vente (décrément) et au food cost par portion — **pas** à la réception.

La réception d'une matière au poids (kg) doit convertir en g via (A) = 1000, **indépendamment** du format. Le format (B) n'intervient qu'au moment de produire/vendre une portion. Tant que (A) et (B) sont fusionnés dans `conversion_factor`, on aura des stocks faux **et** l'impossibilité de gérer plusieurs formats.

## Recommandations (par priorité)

**P0 — Empêcher que ça se reproduise (SaaS, non bloquant pour le POS)**
- À la saisie d'une référence (modale + import doc) : si `order_unit`/`stock_unit` sont convertibles, **imposer/auto-remplir** `conversion_factor = suggestConversionFactor(...)` et **alerter** si l'utilisateur diverge. Bloquer les valeurs manifestement dimensionnellement fausses (ex. 180 pour kg→g).
- À la réception : garde de cohérence (le facteur correspond bien à la conversion order→stock).

**P1 — Affichage cohérent** (`SupplierPriceDisplay`) : nombre et libellé sur la **même base** (afficher `unit_cost` normalisé comme l'historique, ou `unit_price` avec le bon `order_unit`, mais jamais un coût/portion étiqueté « /kg »).

**P2 — Point d'entrée unique validé côté serveur (⚠ coordination POS obligatoire — table partagée)**
La cible : **un RPC unique de mouvement/réception que POS ET SaaS appellent tous les deux**, au lieu des `INSERT stock_movements` + `UPDATE product_stocks` client bruts. Le RPC (SECURITY DEFINER) :
- reçoit `order_qty` + `order_unit` + l'unité de stock et **calcule lui-même** le delta via une conversion canonique (pas un `conversion_factor` libre) ;
- lit le **vrai `current_stock`** pour poser `quantity_before` (ne fait pas confiance au client) ;
- **impose** `movement.unit = product_stocks.unit` ;
- met à jour `current_stock` **atomiquement** dans la même transaction que l'insert du mouvement.
Backstops en base : `CHECK`/trigger validant `conversion_factor` vs `order_unit`/`stock_unit` (unités convertibles), et à terme un trigger qui **recalcule `current_stock`** depuis `stock_movements` (source de vérité unique). Aligner le commentaire SQL de `conversion_factor` sur le code. Réparer l'existant via **`v_stock_reconciliation`** (lignes `has_drift`).
- Note : tant que le RPC n'existe pas, resserrer les GRANTs (retirer le DML direct `anon`/`authenticated` sur `stock_movements`/`product_stocks` au profit du seul RPC) est le levier qui **force** POS et SaaS à passer par le contrôle.

**P3 — Modèle multi-format** (chantier structurant, lié à la restructuration catalogue) : sortir le **format de portion** de `conversion_factor` ; le rendre multi-valué (ex. table de formats par produit, ou portion portée par la ligne de production/vente). Voir `project_catalog_restructure`.

**Réparation des données existantes** (une fois le modèle tranché) : corriger `conversion_factor` (180 → 1000) des références touchées, recalculer `unit_price`/`unit_cost` + snapshots, et rectifier la réception + le `current_stock` déjà faussés (99 → 550, moins la conso réelle).

## Fichiers clés
- Réception → stock : `src/lib/queries/reception-queries.ts:189` (`stockQty = orderQty * f`), modale `product-dashboard-reception-modal*.tsx`, garde `reception-modal-parts.tsx:214-293`.
- Facteur (dérivé vs libre) : `reception-modal-parts.tsx:55-91` (dérivé OK) vs `doc-line-create-modal.tsx:191` (libre).
- Affichage prix : `product-dashboard-supplier-price-card.tsx:117-141/337-342`.
- Food cost : `product-dashboard-marge-panel.tsx:232-247`.
- Triggers : `fn_fifo_valorize`, `fn_snapshot_purchase_price` (`schema:365-395`), `fn_lock_stock_unit` (`schema:337-358`).
- Helpers unités : `src/lib/utils/unit-conversion.ts` (`suggestConversionFactor:106`, `convertUnit`).
</content>
