# 🧹 Fichiers à Supprimer - Nettoyage

Ce fichier liste tous les fichiers et dossiers créés temporairement pour l'implémentation de la nouvelle architecture Zustand + TanStack Query.

## 📁 Dossiers à Supprimer

### `src/lib/stores/`

- `auth-store.ts` - Store Zustand pour l'authentification
- `ui-store.ts` - Store Zustand pour l'interface utilisateur
- `index.ts` - Export des stores

### `src/lib/queries/`

- `auth.ts` - Queries TanStack Query pour l'authentification
- `organizations.ts` - Queries TanStack Query pour les organisations
- `establishments.ts` - Queries TanStack Query pour les établissements
- `index.ts` - Export des queries

### `src/lib/supabase/`

- `client.ts` - Client Supabase côté client
- `server.ts` - Client Supabase côté serveur

### `src/components/providers/`

- `auth-provider.tsx` - Provider d'authentification
- `query-provider.tsx` - Provider TanStack Query

### `src/components/auth/`

- `login-form.tsx` - Formulaire de connexion avec Supabase
- `protected-route.tsx` - Composant de protection des routes

### `src/app/api/auth/`

- `me/route.ts` - API route pour récupérer l'utilisateur
- `login/route.ts` - API route pour la connexion
- `logout/route.ts` - API route pour la déconnexion

## 📄 Fichiers Modifiés à Restaurer

### `src/app/layout.tsx`

- Supprimer les imports des providers
- Restaurer la structure originale

### `src/app/(main)/dashboard/layout.tsx`

- Supprimer l'import de `ProtectedRoute`
- Supprimer le wrapper `ProtectedRoute`

### `src/app/(main)/dashboard/page.tsx`

- Restaurer le contenu original : `return <>Coming Soon</>;`

### `src/app/(main)/auth/login/page.tsx`

- Restaurer l'import de `LoginFormV1` au lieu de `LoginForm`

### `src/middleware.ts`

- Restaurer l'ancien middleware avec `authMiddleware`

### `package.json`

- Supprimer les dépendances ajoutées :
  - `@supabase/ssr`
  - `@supabase/supabase-js`
  - `@tanstack/react-query-devtools`
  - `zustand`

## 🗑️ Commandes de Nettoyage

```bash
# Supprimer les dossiers
rm -rf src/lib/stores/
rm -rf src/lib/queries/
rm -rf src/components/providers/
rm -rf src/components/auth/
rm -rf src/app/api/auth/

# Supprimer ce fichier
rm CLEANUP-FILES.md
```

## ⚠️ Notes

- Ces fichiers ont été créés pour implémenter la nouvelle architecture Zustand + TanStack Query
- Ils peuvent être supprimés si vous préférez garder l'architecture actuelle
- Les modifications apportées aux fichiers existants peuvent être restaurées selon vos besoins
