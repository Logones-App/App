# Architecture des Rôles et Tables

## Vue d'ensemble

L'application utilise un système de rôles multi-tenant avec trois niveaux d'accès :

### Rôles disponibles

- **`system_admin`** : Accès global à toutes les organisations
- **`org_admin`** : Accès limité à une organisation spécifique
- **`visiteur`** : Accès public sans authentification

## Structure des Tables

### Table `users_roles`

**Objectif** : Définir le type de rôle d'un utilisateur

```sql
users_roles {
  id: string
  user_id: string
  role: string ('system_admin' | 'org_admin')
  created_at: timestamp
  created_by: string
  updated_at: timestamp
  updated_by: string
}
```

### Table `users_organizations`

**Objectif** : Lier un utilisateur à une organisation spécifique

```sql
users_organizations {
  id: string
  user_id: string
  organization_id: string
  created_at: timestamp
  deleted: boolean
  updated_at: timestamp
}
```

## Logique d'Association

### Pour un `system_admin` :

```sql
-- users_roles
{ user_id: "xxx", role: "system_admin" }

-- users_organizations
-- AUCUN enregistrement (pas d'organisation spécifique)
```

### Pour un `org_admin` :

```sql
-- users_roles
{ user_id: "xxx", role: "org_admin" }

-- users_organizations
{ user_id: "xxx", organization_id: "org_123" }
```

### Pour un `visiteur` :

```sql
-- users_roles
-- AUCUN enregistrement

-- users_organizations
-- AUCUN enregistrement
```

## Logique de Récupération des Rôles

### Dans `useUserMainRole()` :

1. **Vérifier `system_admin`** :

   ```sql
   SELECT role FROM users_roles
   WHERE user_id = ? AND role = 'system_admin'
   ```

2. **Vérifier `org_admin`** :

   ```sql
   SELECT organization_id, organizations(*)
   FROM users_organizations
   WHERE user_id = ? AND deleted = false
   ```

3. **Fallback** : Si aucun rôle trouvé, créer automatiquement un `system_admin`

## Points Importants

### ⚠️ Erreurs à éviter :

- **NE PAS** insérer `organization_id` dans `users_roles` (cette colonne n'existe pas)
- **NE PAS** oublier de créer les deux enregistrements pour un `org_admin`
- **NE PAS** confondre les tables : `users_roles` pour le type, `users_organizations` pour l'appartenance

### ✅ Bonnes pratiques :

- Toujours vérifier les deux tables pour déterminer le rôle
- Utiliser `createServiceClient()` pour les opérations d'administration
- Gérer les erreurs de contraintes uniques (user_id + role)

## Exemples d'Usage

### Création d'un `org_admin` :

```typescript
// 1. Créer le rôle
await supabase.from("users_roles").insert({
  user_id: userId,
  role: "org_admin",
});

// 2. Lier à l'organisation
await supabase.from("users_organizations").insert({
  user_id: userId,
  organization_id: orgId,
});
```

### Création d'un `system_admin` :

```typescript
// Seulement dans users_roles
await supabase.from("users_roles").insert({
  user_id: userId,
  role: "system_admin",
});
```

## Middleware et Sécurité

Le middleware vérifie les rôles côté serveur pour :

- Rediriger vers `/unauthorized` si pas de permissions
- Permettre l'accès aux pages publiques pour les visiteurs
- Isoler les données par organisation pour les `org_admin`

## Migration et Maintenance

### Ajouter un nouveau rôle :

1. Ajouter le rôle dans `users_roles`
2. Mettre à jour la logique de récupération dans `useUserMainRole()`
3. Mettre à jour le middleware si nécessaire

### Debugging :

- Vérifier les logs dans `useUserMainRole()` pour voir quelle table est consultée
- Utiliser les requêtes SQL directes dans Supabase pour vérifier les données
- Contrôler les policies RLS qui peuvent bloquer les requêtes
