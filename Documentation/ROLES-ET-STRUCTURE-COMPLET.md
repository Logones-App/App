# 🏗️ Système de Rôles et Structure Complète

## 🎯 SYSTÈME DE RÔLES ACTUEL

### Hiérarchie des Rôles

```
1. system_admin (Niveau Système)
   ├── Accès global à toutes les organisations
   ├── Gestion des utilisateurs système
   ├── Configuration globale
   └── Monitoring et statistiques

2. org_admin (Niveau Organisation)
   ├── Accès à ses organisations uniquement
   ├── Gestion des restaurants de son organisation
   ├── Gestion des utilisateurs de son organisation
   └── Configuration de son organisation

3. user (Niveau Utilisateur)
   ├── Accès limité aux fonctionnalités assignées
   ├── Permissions granulaires via user_features
   └── Accès à certains restaurants selon les permissions
```

### Stockage des rôles

- **Les rôles sont désormais stockés uniquement dans les métadonnées Supabase** :
  - `app_metadata.role` (prioritaire)
  - `user_metadata.role` (fallback)
- **Exemple** :
  ```json
  {
    "app_metadata": { "role": "org_admin" },
    "user_metadata": { "role": "org_admin" }
  }
  ```
- **system_admin** : `role = 'system_admin'` dans les métadonnées
- **org_admin** : `role = 'org_admin'` dans les métadonnées
- **user** : `role = 'user'` ou absence de rôle explicite

### Association à une organisation

- **L'association à une organisation se fait via la table `users_organizations`** :
  - `user_id` (UUID de l'utilisateur)
  - `organization_id` (UUID de l'organisation)
  - `deleted` (soft delete)
- **Un org_admin doit avoir** :
  - Un enregistrement dans `users_organizations` avec le bon `organization_id` et `deleted = false`
  - Le rôle `org_admin` dans ses métadonnées
- **Un system_admin** n'a pas besoin d'association dans `users_organizations` (accès global)

### Logique d'accès

- **system_admin** : accès global, détecté via les métadonnées
- **org_admin** : accès limité à ses organisations, détecté via les métadonnées + association dans `users_organizations`
- **user** : accès limité à ses organisations, détecté via association dans `users_organizations` (et éventuellement rôle dans les métadonnées)

### Points importants

- **NE PAS** utiliser de table users_roles (supprimée)
- **NE PAS** stocker le rôle dans `users_organizations` (sauf besoin spécifique de permissions granulaires)
- **Vérifier les deux :**
  - Métadonnées pour le rôle
  - Association dans `users_organizations` pour l'accès aux données

### Exemples d'usage

#### Création d'un org_admin

```typescript
// 1. Définir le rôle dans les métadonnées
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { role: "org_admin" },
});
// 2. Lier à l'organisation
await supabase.from("users_organizations").insert({
  user_id: userId,
  organization_id: orgId,
});
```

#### Création d'un system_admin

```typescript
// Définir le rôle dans les métadonnées
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { role: "system_admin" },
});
```

### Middleware et sécurité

- Le middleware vérifie les rôles côté serveur via les métadonnées
- Pour org_admin, il vérifie aussi l'association dans `users_organizations`
- Redirection vers `/unauthorized` si pas de permissions

### Debugging

- Vérifier les métadonnées de l'utilisateur dans Supabase
- Vérifier l'association dans `users_organizations`
- Contrôler les policies RLS qui peuvent bloquer les requêtes

---

## Tables de Base de Données

### `users_organizations` - Appartenances

```sql
CREATE TABLE users_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);
```

### `user_features` - Permissions Granulaires

```sql
CREATE TABLE user_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_id, organization_id)
);
```

---

## Bonnes pratiques

- Toujours vérifier les métadonnées ET l'association dans `users_organizations`
- Utiliser `app_metadata.role` comme source de vérité pour le rôle
- Ne jamais utiliser de table users_roles
- Documenter toute logique spécifique de permissions granulaires
