# Batterie de tests FIFO — à supprimer après validation

## Scénario A — Réception fournisseur

### A1 — Produit sans fournisseur
- [ ] Ouvrir réception sur un ingrédient sans fournisseur lié
- [ ] **Attendu :** message "Aucun fournisseur lié" + bouton désactivé
- [ ] Essayer de valider quand même
- [ ] **Attendu :** toast erreur "Sélectionnez un fournisseur"

### A2 — Réception simple (sans conversion)
- [ ] Choisir un ingrédient avec fournisseur dont order_unit = stock_unit (ex: "g")
- [ ] Ouvrir réception → sélectionner le fournisseur
- [ ] **Attendu :** label "Quantité (g)", pas de preview de conversion
- [ ] Saisir quantité : **500**, prix total : **3.00** → valider
- [ ] **Attendu :** toast "Mouvement enregistré"

Vérification SQL :
```sql
SELECT id, product_supplier_id, quantity, unit_cost, remaining_quantity
FROM stock_movements WHERE movement_type = 'purchase'
ORDER BY created_at DESC LIMIT 1;
-- Attendu : product_supplier_id non null, quantity=500, unit_cost=0.006, remaining_quantity=500
```
```sql
SELECT unit_price FROM product_suppliers WHERE id = '<id_fournisseur>';
-- Attendu : unit_price = 0.006 (auto-alimenté)
```
```sql
SELECT unit_cost FROM product_purchase_price_history
WHERE product_id = '<id_produit>' ORDER BY effective_from DESC LIMIT 1;
-- Attendu : unit_cost = 0.006
```
- [ ] Vérification SQL : product_supplier_id non null ✓
- [ ] Vérification SQL : unit_cost = 0.006 ✓
- [ ] Vérification SQL : remaining_quantity = 500 ✓
- [ ] Vérification SQL : product_suppliers.unit_price mis à jour ✓
- [ ] Vérification SQL : product_purchase_price_history entrée créée ✓

### A3 — Réception avec conversion (order_unit ≠ stock_unit)
- [ ] Choisir un ingrédient avec stock_unit="g", fournisseur order_unit="kg", units_per_package=1000
- [ ] Ouvrir réception → sélectionner ce fournisseur
- [ ] **Attendu :** label "Quantité reçue (en kg) — 1 kg = 1000 g"
- [ ] Saisir **2** (2 kg)
- [ ] **Attendu :** preview "→ 2 000 g en stock"
- [ ] **Attendu :** hint prix "Prix catalogue : X €/kg → suggestion : Y €" (si unit_price renseigné)
- [ ] Saisir prix total : **16.00** → valider

Vérification SQL :
```sql
SELECT quantity, unit_cost, remaining_quantity
FROM stock_movements WHERE movement_type = 'purchase'
ORDER BY created_at DESC LIMIT 1;
-- Attendu : quantity=2000, unit_cost=0.008, remaining_quantity=2000
```
```sql
SELECT unit_price FROM product_suppliers WHERE id = '<id_fournisseur>';
-- Attendu : unit_price = 8 (reconverti €/kg = 0.008 × 1000)
```
- [ ] Vérification SQL : quantity = 2000 (converti en g) ✓
- [ ] Vérification SQL : unit_cost = 0.008 ✓
- [ ] Vérification SQL : product_suppliers.unit_price = 8 (€/kg) ✓

### A4 — Réception sans units_per_package
- [ ] Choisir un fournisseur avec order_unit="carton" mais units_per_package=null
- [ ] Ouvrir réception → sélectionner ce fournisseur
- [ ] **Attendu :** avertissement amber "Facteur de conversion manquant pour carton → g"
- [ ] Le champ quantité reste saisissable (en stock_unit directement)

---

## Scénario B — Verrou d'unité

### B1 — Blocage si lots actifs (utiliser l'ingrédient du scénario A2)
- [ ] Sur la fiche stock de l'ingrédient ayant remaining_quantity > 0
- [ ] Cliquer "Changer l'unité de stock"
- [ ] **Attendu :** bandeau rouge "Changement d'unité impossible : 1 lot FIFO actif en stock"
- [ ] **Attendu :** bouton "Confirmer la conversion" désactivé (grisé)

### B2 — Changement autorisé si stock soldé
- [ ] Manuellement solder le stock via SQL si nécessaire :
```sql
UPDATE stock_movements SET remaining_quantity = 0
WHERE product_id = '<id_produit>' AND movement_type = 'purchase';
```
- [ ] Cliquer "Changer l'unité de stock"
- [ ] **Attendu :** aucun bandeau rouge, bouton actif après saisie du facteur
- [ ] Saisir un facteur et valider
- [ ] **Attendu :** toast "Unité de stock mise à jour" + mouvement adjustment enregistré

---

## Scénario C — FIFO multi-lots (POS requis)

### C1 — Réception lot 1
- [ ] Réceptionner 1 000 g à 5 € total (unit_cost = 0.005) → fournisseur F1

Vérification SQL :
```sql
SELECT id, quantity, unit_cost, remaining_quantity FROM stock_movements
WHERE movement_type = 'purchase' ORDER BY created_at DESC LIMIT 1;
-- Attendu : quantity=1000, unit_cost=0.005, remaining_quantity=1000
```
- [ ] Noté l'id du lot A : `_______________`

### C2 — Réception lot 2 (prix différent)
- [ ] Réceptionner 2 000 g à 16 € total (unit_cost = 0.008) → fournisseur F2

- [ ] Noté l'id du lot B : `_______________`

### C3 — Vente POS de 1 200 g (POS team)
- [ ] POS : faire une vente contenant cet ingrédient pour 1 200 g

Vérification SQL :
```sql
SELECT id, quantity, unit_cost, lot_allocations, remaining_quantity
FROM stock_movements WHERE movement_type = 'sale'
ORDER BY created_at DESC LIMIT 1;
-- Attendu : lot_allocations contient 2 entrées (lot A 1000g + lot B 200g)
-- unit_cost ≈ 0.0055 (COGS = 6.60 / 1200)
```
```sql
SELECT id, remaining_quantity FROM stock_movements
WHERE movement_type = 'purchase' ORDER BY created_at ASC;
-- Attendu : lot A remaining_quantity=0, lot B remaining_quantity=1800
```
- [ ] Vérification : lot_allocations renseigné avec 2 lots ✓
- [ ] Vérification : lot A soldé (remaining_quantity = 0) ✓
- [ ] Vérification : lot B partiellement consommé (remaining_quantity = 1800) ✓
- [ ] COGS total = 6.60 € ✓

---

## Scénario D — Vue de réconciliation

```sql
-- Exécuter la vue (si pas encore créée, appliquer le SQL dans Supabase d'abord)
SELECT * FROM v_stock_reconciliation WHERE has_drift = TRUE;
-- Attendu : aucune ligne (ou lignes identifiant des drifts connus)

SELECT product_stock_id, current_stock, fifo_remaining_total, drift
FROM v_stock_reconciliation ORDER BY ABS(drift) DESC;
```
- [ ] Vue v_stock_reconciliation créée dans Supabase ✓
- [ ] Aucun drift inattendu ✓

---

## Scénario E — Reporting FIFO (dashboard)

- [ ] Aller sur le dashboard Reporting
- [ ] **COGS par jour** : doit afficher le coût de la vente C3 (6.60 €)
- [ ] **Valorisation stock** : lot B → 1 800 g × 0.008 = 14.40 €
- [ ] **Historique réceptions** : doit afficher les réceptions A2, A3, C1, C2

---

## Résultat global
- [ ] Tous les scénarios A passent ✓
- [ ] Tous les scénarios B passent ✓
- [ ] Scénario C validé avec POS ✓
- [ ] Scénario D : aucun drift ✓
- [ ] Scénario E : reporting cohérent ✓

**→ Supprimer ce fichier après validation complète**
