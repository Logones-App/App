# 🔧 Guide de Configuration System Admin

## 🎯 Objectif

Configurer correctement l'utilisateur `e8d33df2-5a44-40b7-95c2-1b0cbc29838e` comme `system_admin` et tester que l'authentification fonctionne.

## 📋 Étapes à Suivre

### 1. Vérifier l'État Actuel

Exécutez d'abord le script de vérification :

```sql
-- Dans Supabase SQL Editor
-- Exécuter le contenu de scripts/check-user-roles.sql
```

### 2. Ajouter le Rôle System Admin

Si l'utilisateur n'a pas de rôle dans `users_roles`, exécutez :

```sql
-- Dans Supabase SQL Editor
-- Exécuter le contenu de scripts/add-system-admin-role.sql
```

### 3. Ajouter la Contrainte d'Unicité (si pas encore fait)

```sql
-- Dans Supabase SQL Editor
-- Exécuter le contenu de scripts/final-users-organizations-constraint.sql
```

## 🔍 Vérifications Attendues

### Après l'exécution des scripts, vous devriez voir :

1. **Dans `users_roles`** :

   ```sql
   user_id: "e8d33df2-5a44-40b7-95c2-1b0cbc29838e"
   role: "system_admin"
   ```

2. **Dans `users_organizations`** :

   - Soit aucun enregistrement (si l'utilisateur est purement system_admin)
   - Soit l'enregistrement avec `deleted = true` (si on a supprimé l'organisation)

3. **Dans `auth.users`** :
   - L'utilisateur existe avec les métadonnées correctes

## 🧪 Tests à Effectuer

### 1. Test de l'API Route

Accédez à : `http://localhost:3000/api/auth/roles`

**Résultat attendu** :

```json
{
  "role": "system_admin",
  "organizationId": null
}
```

### 2. Test de l'Application

1. **Démarrer le serveur** :

   ```bash
   npm run dev
   ```

2. **Accéder à l'application** :
   - Aller sur `http://localhost:3000`
   - Se connecter avec l'utilisateur
   - Vérifier que la redirection fonctionne

### 3. Vérification des Logs

Dans la console du navigateur, vous devriez voir :

```
🔍 Récupération des rôles via API...
🔍 API response status: 200
🔍 API response data: {role: "system_admin", organizationId: null}
✅ System admin trouvé via API!
```

## 🚨 Problèmes Possibles

### Si l'API retourne une erreur 401 :

- Vérifier que les cookies d'authentification sont présents
- Vérifier que l'utilisateur est bien connecté

### Si l'API retourne une erreur 500 :

- Vérifier les logs côté serveur
- Vérifier que les tables existent et sont accessibles

### Si l'utilisateur n'est pas détecté comme system_admin :

- Vérifier que le rôle existe dans `users_roles`
- Vérifier que l'enregistrement dans `users_organizations` est supprimé ou `deleted = true`

## 🔄 Rollback (si nécessaire)

Si vous devez annuler les changements :

```sql
-- Supprimer le rôle system_admin
DELETE FROM users_roles
WHERE user_id = 'e8d33df2-5a44-40b7-95c2-1b0cbc29838e'
AND role = 'system_admin';

-- Restaurer l'organisation (si elle était supprimée)
UPDATE users_organizations
SET deleted = false, updated_at = NOW()
WHERE user_id = 'e8d33df2-5a44-40b7-95c2-1b0cbc29838e';
```

## 📝 Notes Importantes

- **System Admin** : N'a pas d'organisation spécifique, accès global
- **Org Admin** : A une organisation spécifique, accès limité
- **Contrainte d'unicité** : Un utilisateur ne peut avoir qu'une seule organisation active
- **Soft Delete** : Les enregistrements supprimés ont `deleted = true`

## ✅ Validation Finale

Une fois tout configuré, l'utilisateur devrait :

1. ✅ Être détecté comme `system_admin` par l'API
2. ✅ Avoir accès aux routes `/admin/*`
3. ✅ Voir toutes les organisations dans le dashboard admin
4. ✅ Ne pas avoir d'organisation spécifique assignée
