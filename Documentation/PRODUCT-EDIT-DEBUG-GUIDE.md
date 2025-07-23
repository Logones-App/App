# Guide de Diagnostic - Modification de Produits

## Problème Signalé

La modal de modification de produits ne fonctionne pas correctement.

## Diagnostic Implémenté

### 1. Logs de Debug Ajoutés

**Fonction `startEditProduct`** :

```typescript
console.log("🔍 Debug startEditProduct - product:", product);
console.log("✅ Formulaire d'édition initialisé:", formData);
```

**Fonction `saveProductEdit`** :

```typescript
console.log("🔍 Debug saveProductEdit - editingProductId:", editingProductId, "editProductForm:", editProductForm);
```

**Mutation `updateProductMutation`** :

```typescript
console.log("🔍 Debug updateProductMutation - id:", id, "payload:", payload);
console.log("✅ Produit mis à jour avec succès:", data);
console.log("✅ onSuccess updateProductMutation:", updated);
```

### 2. Validation Améliorée

**Vérifications ajoutées** :

- ✅ ID de produit en cours d'édition
- ✅ Nom de produit non vide
- ✅ Prix supérieur à 0
- ✅ Gestion des erreurs avec messages utilisateur

### 3. Gestion d'Erreur

**Affichage des erreurs** :

- ✅ Alert d'erreur dans la modal
- ✅ Messages d'erreur spécifiques
- ✅ Logs d'erreur dans la console

## Étapes de Diagnostic

### 1. Vérifier la Console

Ouvrir les outils de développement (F12) et vérifier :

**Lors de l'ouverture de la modal** :

```
🔍 Debug startEditProduct - product: {id: "...", name: "...", ...}
✅ Formulaire d'édition initialisé: {name: "...", price: ..., ...}
```

**Lors de la sauvegarde** :

```
🔍 Debug saveProductEdit - editingProductId: "...", editProductForm: {...}
✅ Validation OK, lancement de la mutation
🔍 Debug updateProductMutation - id: "...", payload: {...}
✅ Produit mis à jour avec succès: {...}
✅ onSuccess updateProductMutation: {...}
```

### 2. Vérifier les Erreurs

**Erreurs possibles** :

- ❌ "Pas d'ID de produit en cours d'édition"
- ❌ "Nom de produit vide"
- ❌ "Prix invalide"
- ❌ "Erreur Supabase updateProduct: ..."

### 3. Vérifier les Permissions

**Script SQL de diagnostic** :

```sql
-- Vérifier les politiques RLS
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products';

-- Vérifier les permissions
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'products';
```

### 4. Vérifier la Structure

**Champs requis** :

- ✅ `id` (UUID)
- ✅ `name` (text, NOT NULL)
- ✅ `price` (numeric, NOT NULL)
- ✅ `vat_rate` (integer)
- ✅ `is_available` (boolean)
- ✅ `organization_id` (UUID, NOT NULL)

## Solutions Possibles

### 1. Problème de Permissions RLS

**Symptôme** : Erreur 403 ou 401
**Solution** : Vérifier les politiques RLS sur la table `products`

```sql
-- Exemple de politique RLS pour modification
CREATE POLICY "Users can update their organization products" ON products
FOR UPDATE USING (organization_id = auth.jwt() ->> 'organization_id');
```

### 2. Problème de Validation

**Symptôme** : Erreur de contrainte
**Solution** : Vérifier les contraintes de la table

```sql
-- Vérifier les contraintes
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'products'::regclass;
```

### 3. Problème de Cache

**Symptôme** : Modification réussie mais pas visible
**Solution** : Vérifier l'invalidation du cache

```typescript
// Invalidation des requêtes
queryClient.invalidateQueries({
  queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
});
queryClient.invalidateQueries({
  queryKey: ["organization-products", organizationId],
});
```

### 4. Problème de TypeScript

**Symptôme** : Erreurs de compilation
**Solution** : Vérifier les types

```typescript
// Types corrects
type Product = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
```

## Tests à Effectuer

### 1. Test Simple

1. Ouvrir la modal d'édition
2. Modifier le nom du produit
3. Cliquer sur "Sauvegarder"
4. Vérifier les logs dans la console
5. Vérifier que la modification apparaît dans le tableau

### 2. Test avec Erreur

1. Ouvrir la modal d'édition
2. Effacer le nom du produit
3. Cliquer sur "Sauvegarder"
4. Vérifier que l'erreur s'affiche
5. Vérifier les logs d'erreur

### 3. Test de Permissions

1. Se connecter avec un utilisateur différent
2. Essayer de modifier un produit d'une autre organisation
3. Vérifier que l'erreur de permission s'affiche

## Commandes de Debug

### 1. Vérifier les Logs

```bash
# Dans la console du navigateur
# Vérifier les logs de debug
```

### 2. Vérifier la Base de Données

```sql
-- Exécuter le script de diagnostic
\i scripts/debug-product-edit.sql
```

### 3. Vérifier les Requêtes

```typescript
// Dans la console du navigateur
// Vérifier les requêtes React Query
console.log(queryClient.getQueryCache().getAll());
```

## Résolution Recommandée

1. **Vérifier les logs** dans la console du navigateur
2. **Identifier l'erreur** spécifique
3. **Vérifier les permissions** RLS
4. **Tester avec un utilisateur admin** si nécessaire
5. **Vérifier la structure** de la base de données

## Contact

Si le problème persiste, fournir :

- Les logs de la console
- L'erreur spécifique
- Les permissions de l'utilisateur
- La structure de la table products
