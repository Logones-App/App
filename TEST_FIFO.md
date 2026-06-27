# Batterie de tests — Stock / Achats / FIFO (modèle actuel)

> Plan de test manuel après la refonte produits/achats (réception fournisseur→référence,
> unité de gestion à la 1ʳᵉ référence, prix unitaire, types de produit, garde-fous).
> Tables actuelles : `supplier_references`, `supplier_price_snapshots`, `stock_movements`,
> `product_stocks`, `product_compositions`. (Anciennes `product_suppliers` /
> `product_purchase_price_history` supprimées.)

---

## A — Types de produit & onglets

### A1 — Onglets selon le type
- [ ] **Ingrédient pur** → onglets : Propriété · Stock · Recette · **Achats**
- [ ] **Recette** → Propriété · Prix & Menus · Personnalisation · Stock · **Recette** (avec « Achat direct »)
- [ ] **Achat direct (purchased)** → Propriété · Prix & Menus · Personnalisation · Stock · **Achats** (pas d'onglet Recette)
- [ ] **Préparation (ingrédient + recette)** → a un onglet Recette (BOM), **pas** d'onglet Achats (sauf si aussi `purchased`)

### A2 — Aide du sélecteur de type
- [ ] Le bloc d'aide affiche les 3 combinaisons (préparation, utilisé+vendu, cuisiné ou acheté) + l'astuce stock partagé

---

## B — Garde-fous au changement de type

### B1 — Retrait « Ingrédient » utilisé en recette
- [ ] Produit utilisé comme ingrédient dans ≥1 recette → décocher « Ingrédient » → Enregistrer
- [ ] **Attendu :** 🔴 bloqué, message listant les recettes concernées

### B2 — Retrait « Ingrédient » avec stock actif
- [ ] Ingrédient avec lots FIFO actifs → décocher « Ingrédient »
- [ ] **Attendu :** 🔴 bloqué « des lots de stock sont actifs, soldez le stock d'abord »

### B3 — Devenir non-vendu alors que présent sur un menu/formule
- [ ] Produit vendu (sur un menu) → retirer Recette + Achat direct
- [ ] **Attendu :** 🔴 bloqué « présent sur des menus ou des formules »

### B4 — Retrait « Recette » avec BOM
- [ ] Recette ayant une fiche technique → décocher « Recette »
- [ ] **Attendu :** 🟠 confirmation « le BOM sera conservé mais inactif »

### B5 — Zéro type
- [ ] Tout décocher → **Attendu :** 🔴 bloqué « au moins un type »

---

## C — Réception fournisseur (onglet Achats, ingrédient)

### C1 — Première réception définit l'unité de gestion
- [ ] Ingrédient **sans stock** → « Nouvelle réception »
- [ ] Choisir/créer fournisseur → « + Nouvelle référence »
- [ ] Désignation, unité d'achat **g**, contenance auto, **unité de gestion g** (sélecteur visible)
- [ ] Saisir qté **500**, PU **0,006 €/g** → enregistrer
- [ ] **Attendu :** toast « Réception enregistrée », fiche stock créée (unité **g**), stock = 500 g

```sql
SELECT unit, current_stock FROM product_stocks WHERE id = '<id_stock>';
-- Attendu : unit='g', current_stock=500
SELECT supplier_reference_id, quantity, unit, unit_cost, remaining_quantity
FROM stock_movements WHERE movement_type='purchase' ORDER BY created_at DESC LIMIT 1;
-- Attendu : supplier_reference_id non null, quantity=500, unit='g', unit_cost=0.006, remaining_quantity=500
```

### C2 — Réception dimensionnelle (kg → g, contenance auto)
- [ ] Même ingrédient (gestion **g**), nouvelle référence Metro : unité d'achat **kg**
- [ ] **Attendu :** contenance **1000** auto-remplie et **verrouillée** (« Conversion automatique »)
- [ ] Qté **2** (kg), PU **8 €/kg** → enregistrer
- [ ] **Attendu :** « → 2000 g en stock », total 16 €, coût FIFO 0,008 €/g

```sql
SELECT quantity, unit_cost, remaining_quantity FROM stock_movements
WHERE movement_type='purchase' ORDER BY created_at DESC LIMIT 1;
-- Attendu : quantity=2000, unit_cost=0.008, remaining_quantity=2000
SELECT order_unit, conversion_factor, unit_price FROM supplier_references WHERE id='<ref>';
-- Attendu : order_unit='kg', conversion_factor=1000, unit_price=8
```

### C3 — Réception non-dimensionnelle (colis/pièce, contenance manuelle)
- [ ] Nouvelle référence : unité d'achat **pièce** (colis), gestion **g**
- [ ] **Attendu :** contenance **saisie manuelle** (pas auto). Saisir **2500** (1 colis = 2500 g)
- [ ] Qté **2** colis, PU **20 €** → « → 5000 g en stock », coût FIFO 0,008 €/g

### C4 — Référence existante (réutilisation)
- [ ] Refaire une réception → choisir le fournisseur → la **liste des références** existantes apparaît
- [ ] Sélectionner une réf existante → pas de re-saisie de contenance, juste qté + PU

---

## D — Ajouter un prix d'achat (sans réception)

### D1 — Prix sur référence, sans mouvement
- [ ] Onglet Achats → « Ajouter un prix d'achat » → fournisseur + référence + PU (pas de champ quantité)
- [ ] **Attendu :** snapshot créé, `unit_price` de la référence mis à jour, **aucun** mouvement de stock

```sql
SELECT unit_cost, effective_from FROM supplier_price_snapshots
WHERE supplier_reference_id='<ref>' ORDER BY effective_from DESC LIMIT 1;
-- Attendu : une ligne à la date du jour
SELECT count(*) FROM stock_movements WHERE supplier_reference_id='<ref>' AND movement_type='purchase';
-- Attendu : inchangé (le prix seul ne crée pas de réception)
```

### D2 — 1ʳᵉ référence via prix crée la fiche stock à 0
- [ ] Sur un ingrédient sans stock, « Ajouter un prix d'achat » avec nouvelle référence + unité de gestion
- [ ] **Attendu :** `product_stocks` créé avec `current_stock = 0` et l'unité choisie

---

## E — Historique des réceptions (édition / suppression)

### E1 — Affichage
- [ ] La carte « Réceptions fournisseur » liste les réceptions : Date · Fournisseur · Référence · Qté · PU · Total

### E2 — Suppression d'un lot intact
- [ ] Supprimer une réception **non entamée** (remaining = quantité)
- [ ] **Attendu :** mouvement soft-deleted, `current_stock` diminué d'autant

### E3 — Lot entamé → bloqué
- [ ] Sur un lot partiellement consommé par une vente → l'action est remplacée par 🔒 (tooltip « corrigez via un ajustement »)

### E4 — Édition (qté + PU) d'un lot intact
- [ ] Modifier qté/PU d'un lot intact → `current_stock`, `unit_cost`, `remaining_quantity` recalculés

---

## F — Carte référence fournisseur

### F1 — Prix en lecture seule
- [ ] Le prix s'affiche mais n'est **pas éditable** sur la carte (mention « modifiable via Ajouter un prix d'achat »)

### F2 — Édition libellés
- [ ] « Modifier » → réf. article + désignation éditables → OK (pas de snapshot créé)

### F3 — Changer l'unité d'achat dimensionnelle (kg → g)
- [ ] Sur une référence dimensionnelle → sélecteur d'unité d'achat (même nature seulement)
- [ ] Passer **kg → g** → **Attendu :** contenance + prix **recalculés auto** (ex : 8 €/kg → 0,008 €/g)

### F4 — Éditer la contenance (non-dimensionnelle)
- [ ] Sur une référence colis/pièce → champ contenance éditable (ex : 2500 → 2400)

### F5 — Suppression d'un snapshot recale le cache
- [ ] Déplier l'historique → supprimer la **dernière** entrée
- [ ] **Attendu :** `supplier_references.unit_price` recalé sur le snapshot restant le plus récent (ou vidé si plus aucun) — pas de prix « fantôme »

### F6 — Historique par référence
- [ ] Avec 2 références du même fournisseur → chaque carte montre **son propre** historique

---

## G — Verrou d'unité de stock

### G1 — Masqué si lots actifs
- [ ] Fiche stock avec `remaining_quantity > 0` → **Attendu :** ligne discrète 🔒 « Unité verrouillée », pas de bouton de changement

### G2 — Soldé → changement possible
```sql
UPDATE stock_movements SET remaining_quantity = 0
WHERE product_id = '<id>' AND movement_type = 'purchase';
```
- [ ] **Attendu :** « Changer l'unité » réapparaît ; à stock 0, **pas de champ facteur** (choix simple de l'unité)

### G3 — Stock non-FIFO (recette « produit fini »)
- [ ] Recette en mode « produit fini » avec quantité produite → « Changer l'unité » propose un **facteur** (vraie reconversion)

---

## H — FIFO multi-lots (POS requis)

### H1 — Deux lots, prix différents
- [ ] Lot A : 1000 g à 0,005 €/g · Lot B : 2000 g à 0,008 €/g

### H2 — Vente POS de 1200 g
- [ ] POS : vente consommant 1200 g de l'ingrédient

```sql
SELECT quantity, unit_cost, lot_allocations FROM stock_movements
WHERE movement_type='sale' ORDER BY created_at DESC LIMIT 1;
-- Attendu : lot_allocations = 2 entrées (lot A 1000g + lot B 200g), unit_cost ≈ 0.0055 (COGS 6.60/1200)
SELECT remaining_quantity FROM stock_movements
WHERE movement_type='purchase' ORDER BY created_at ASC;
-- Attendu : lot A=0, lot B=1800
```

---

## I — Réconciliation & revue

### I1 — Vue de réconciliation
```sql
SELECT * FROM v_stock_reconciliation WHERE has_drift = TRUE;
-- Attendu : aucune ligne (ou drifts connus uniquement)
```
- [ ] Onglet Stocks établissement → bouton « Réconciliation FIFO » → tableau cohérent

### I2 — Mouvements à revoir
```sql
SELECT count(*) FROM stock_movements WHERE needs_review = TRUE AND deleted = false;
```
- [ ] Si > 0 → bannière orange « N mouvement(s) à revoir » dans l'onglet Stocks

---

## J — Reporting FIFO (dashboard)

- [ ] **COGS / jour** : reflète les ventes (ex. H2 = 6,60 €)
- [ ] **Valorisation stock** : `SUM(remaining_quantity × unit_cost)` (ex. lot B 1800 × 0,008 = 14,40 €)
- [ ] **Food cost recette** : utilise la même base FIFO (`remaining_quantity`) que la valorisation → cohérent
- [ ] **Historique prix ingrédient** : liste les réceptions avec leur coût

---

## K — Cas métier : stock partagé (vin bouteille + verre)

### K1 — Modélisation
- [ ] Ingrédient **« Côtes du Rhône (vin) »**, gestion **cl**, réception en bouteille (1 pièce = 75 cl)
- [ ] Recette **« Bouteille 75 cl »** : BOM 75 cl du vin
- [ ] Recette **« Verre 12 cl »** : BOM 12 cl du vin

### K2 — Stock partagé
- [ ] Vendre 1 bouteille → −75 cl ; vendre 1 verre → −12 cl, **depuis le même stock vin**
- [ ] **Attendu :** un seul compteur de stock (le vin en cl) décrémenté par les deux ventes

### L — Cas métier : acheté-revendu indivisible (canette)
- [ ] Produit **`purchased`** « Canette Coca » (1 produit, pas d'ingrédient séparé)
- [ ] Onglet Achats → réception (unité **pièce**) ; vente POS → −1 pièce

---

## Résultat global
- [ ] A · B · C · D · E · F · G passent (UI + DB)
- [ ] H validé avec POS · I aucun drift · J reporting cohérent
- [ ] K / L cas métier OK

**→ Supprimer ce fichier après validation complète.**
