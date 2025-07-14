# 🔒 Guide pour Ajouter la Contrainte d'Unicité sur `users_organizations`

## 🎯 Objectif

Ajouter une contrainte d'unicité sur la table `users_organizations` pour s'assurer qu'un utilisateur ne peut avoir qu'une seule organisation.

## 📋 Étapes à Suivre

### 1. Vérifier l'État Actuel

Exécutez d'abord cette requête pour voir s'il y a des doublons :

```sql
SELECT
  user_id,
  COUNT(*) as count,
  array_agg(organization_id) as organizations
FROM users_organizations
WHERE deleted = false
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### 2. Nettoyer les Doublons

Si des doublons existent, exécutez le script de nettoyage :

```bash
# Dans Supabase SQL Editor
# Exécuter le contenu de scripts/cleanup-users-organizations-duplicates.sql
```

### 3. Ajouter la Contrainte

Exécutez le script final :

```bash
# Dans Supabase SQL Editor
# Exécuter le contenu de scripts/final-users-organizations-constraint.sql
```

## 🔧 Scripts Disponibles

### `scripts/cleanup-users-organizations-duplicates.sql`

- Identifie les doublons
- Supprime les doublons (user_id, organization_id)
- Supprime les doublons par utilisateur

### `scripts/add-unique-constraint-users-organizations.sql`

- Ajoute la contrainte d'unicité
- Vérifie que la contrainte a été ajoutée

### `scripts/final-users-organizations-constraint.sql`

- Script complet qui fait tout en une fois

## ✅ Vérifications

Après l'exécution, vérifiez que :

1. **Aucun doublon** : Chaque utilisateur n'a qu'une seule organisation
2. **Contrainte ajoutée** : La contrainte `users_organizations_user_unique` existe
3. **Code fonctionne** : Les requêtes utilisent `.single()` au lieu de `.limit(1)`

## 🚨 Points d'Attention

### Avant l'Exécution

- **Sauvegarder** les données importantes
- **Tester** sur un environnement de développement
- **Vérifier** qu'aucune application n'écrit de doublons

### Après l'Exécution

- **Tester** les fonctionnalités d'authentification
- **Vérifier** que les utilisateurs existants fonctionnent
- **Mettre à jour** le code pour utiliser `.single()`

## 🔄 Impact sur le Code

### Avant (avec doublons possibles)

```typescript
const { data: orgRoles } = await supabase
  .from("users_organizations")
  .select("*")
  .eq("user_id", userId)
  .eq("deleted", false);

if (orgRoles && orgRoles.length > 0) {
  const firstOrg = orgRoles[0];
  // ...
}
```

### Après (avec contrainte d'unicité)

```typescript
const { data: orgRole } = await supabase
  .from("users_organizations")
  .select("*")
  .eq("user_id", userId)
  .eq("deleted", false)
  .single();

if (orgRole) {
  // ...
}
```

## 📊 Bénéfices

1. **Intégrité des données** : Impossible d'avoir des doublons
2. **Performance** : Requêtes plus rapides avec `.single()`
3. **Simplicité** : Code plus clair et prévisible
4. **Cohérence** : Aligne avec le modèle métier (un utilisateur = une organisation)

## 🛠️ Rollback (si nécessaire)

Si vous devez annuler la contrainte :

```sql
ALTER TABLE users_organizations
DROP CONSTRAINT users_organizations_user_unique;
```

## 📝 Notes

- La contrainte s'applique seulement aux enregistrements où `deleted = false`
- Les enregistrements supprimés (`deleted = true`) ne sont pas affectés
- Cette approche est cohérente avec le système de soft delete existant
