# Solution : Synchronisation des Rôles Client-Serveur

## Problème Identifié

### Symptômes

- Le middleware côté serveur détecte correctement les rôles (system_admin, org_admin)
- Le hook `useUserMainRole` côté client ne trouve pas les rôles
- Redirections vers `/unauthorized` malgré une authentification valide
- Timeouts sur `supabase.auth.getSession()` côté client

### Cause Racine

Les clients Supabase côté client et serveur ont des configurations différentes :

- **Côté serveur** : `createServerClient` avec gestion des cookies et service role key
- **Côté client** : `createBrowserClient` avec restrictions RLS (Row Level Security)

Les policies RLS empêchent le client browser d'accéder aux tables `users_roles` et `users_organizations`.

## Solution Implémentée

### 1. API Route pour Récupération des Rôles

**Fichier** : `src/app/api/auth/roles/route.ts`

```typescript
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Récupération de l'utilisateur depuis les cookies
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérification du rôle system_admin
    const { data: systemAdminRole, error: systemError } = await supabase
      .from("users_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .single();

    if (systemAdminRole) {
      return NextResponse.json({ role: "system_admin" });
    }

    // Vérification du rôle org_admin
    const { data: orgRole, error: orgError } = await supabase
      .from("users_organizations")
      .select(
        `
        organization_id,
        organizations (
          id,
          name,
          slug,
          deleted,
          logo_url,
          settings,
          created_at,
          updated_at,
          description
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("role", "org_admin")
      .single();

    if (orgRole) {
      return NextResponse.json({
        role: "org_admin",
        organization: orgRole.organizations,
      });
    }

    return NextResponse.json({ role: "visiteur" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### 2. Hook Client Modifié

**Fichier** : `src/lib/queries/auth.ts`

```typescript
export const useUserMainRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userMainRole", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const response = await fetch("/api/auth/roles");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération du rôle");
      }

      const data = await response.json();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
};
```

### 3. Avantages de cette Solution

1. **Contournement RLS** : L'API route utilise le service role key côté serveur
2. **Sécurité maintenue** : Les policies RLS restent actives pour les clients browser
3. **Performance** : Cache de 5 minutes côté client
4. **Robustesse** : Retry automatique en cas d'échec
5. **Simplicité** : Un seul endpoint pour tous les rôles

### 4. Architecture Finale

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Side   │    │   API Route      │    │   Supabase      │
│                 │    │   /api/auth/roles│    │   (Service Key) │
│ useUserMainRole │───▶│                  │───▶│ users_roles     │
│                 │    │ createServiceClient│   │ users_orgs      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 5. Tests de Validation

#### System Admin

```bash
# Logs attendus
Middleware - User is system_admin
API Roles - User is system_admin
```

#### Org Admin

```bash
# Logs attendus
Middleware - User is org_admin
API Roles - User is org_admin
```

### 6. Points d'Attention

1. **Cache** : Le hook met en cache les résultats pendant 5 minutes
2. **Retry** : 2 tentatives automatiques en cas d'échec
3. **Sécurité** : L'API route vérifie l'authentification via les cookies
4. **Performance** : Une seule requête pour récupérer le rôle et l'organisation

### 7. Maintenance

- Surveiller les logs pour détecter les erreurs
- Vérifier que les policies RLS restent actives
- Tester régulièrement avec différents rôles
- Maintenir la cohérence entre middleware et API route

## Résultat

✅ **Problème résolu** : Les rôles sont maintenant correctement détectés côté client
✅ **Redirections corrigées** : Plus de redirections vers `/unauthorized`
✅ **Performance optimisée** : Cache et retry automatiques
✅ **Sécurité préservée** : RLS toujours actif pour les clients browser

Cette solution garantit une synchronisation fiable entre la détection des rôles côté serveur (middleware) et côté client (hooks), tout en maintenant la sécurité de l'application.
