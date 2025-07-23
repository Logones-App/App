# Correction de la Contrainte product_stocks_positive

## Problème

L'erreur Supabase suivante se produisait lors de l'association de produits :

```
new row for relation "product_stocks" violates check constraint "product_stocks_positive"
```

**Cause** : La contrainte de base de données n'acceptait que des valeurs `current_stock >= 0`, mais notre logique métier utilise `current_stock = -1` pour indiquer "pas de gestion de stock".

## Solution

Modifier la contrainte de base de données pour accepter `current_stock >= -1`.

### Logique Métier

- `current_stock = -1` : Pas de gestion de stock (produit associé mais sans suivi de stock)
- `current_stock = 0` : Stock vide (gestion de stock activée mais quantité nulle)
- `current_stock > 0` : Stock disponible

## Application de la Correction

### Option 1 : Via Supabase Dashboard

1. Ouvrir le Supabase Dashboard
2. Aller dans l'éditeur SQL
3. Exécuter le script `scripts/apply-product-stocks-constraint-fix.sql`

### Option 2 : Via psql

```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f scripts/apply-product-stocks-constraint-fix.sql
```

### Option 3 : Via l'interface Supabase

1. Aller dans Database > Tables > product_stocks
2. Cliquer sur "Constraints"
3. Supprimer la contrainte `product_stocks_positive`
4. Ajouter une nouvelle contrainte CHECK avec la condition :
   ```sql
   current_stock >= -1 AND
   min_stock >= 0 AND
   (max_stock IS NULL OR max_stock >= 0) AND
   (low_stock_threshold IS NULL OR low_stock_threshold >= 0) AND
   (critical_stock_threshold IS NULL OR critical_stock_threshold >= 0) AND
   reserved_stock >= 0
   ```

## Vérification

Après application, vérifier que la contrainte a été mise à jour :

```sql
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'product_stocks_positive';
```

## Impact

- ✅ Les insertions avec `current_stock = -1` fonctionneront
- ✅ La logique métier est préservée
- ✅ Les autres contraintes de validation restent en place
- ✅ Aucun impact sur les données existantes

## Tests

Après la correction, tester :

1. **Association de produit** : Associer un produit existant à un établissement
2. **Création de produit** : Créer un nouveau produit avec gestion de stock
3. **Modification de stock** : Modifier les valeurs de stock existantes

## Code TypeScript

Le code TypeScript utilise déjà la bonne valeur :

```typescript
const insertData = {
  // ...
  current_stock: -1, // Pas de gestion de stock par défaut
  // ...
} as ProductStockInsert;
```

## Sécurité

Cette modification :

- ✅ Maintient l'intégrité des données
- ✅ Préserve la logique métier
- ✅ N'introduit pas de vulnérabilités
- ✅ Reste compatible avec l'application existante
