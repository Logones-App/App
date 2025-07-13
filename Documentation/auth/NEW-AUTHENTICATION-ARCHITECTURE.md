# 🔐 Nouvelle Architecture d'Authentification - Documentation Complète

## 📋 Vue d'ensemble

Ce document détaille la nouvelle architecture d'authentification proposée pour remplacer le système actuel basé sur LegendState. La nouvelle stack utilise **Zustand** pour l'état client, **TanStack Query** pour le cache et les données serveur, et **Supabase** pour l'authentification et le realtime.

> **📝 Note importante** : Pour la synchronisation entre client et serveur, voir les documents :
>
> - [ROLES-CLIENT-SERVER-SYNC-SOLUTION.md](./ROLES-CLIENT-SERVER-SYNC-SOLUTION.md) - Solution pour la détection des rôles
> - [SESSION-CLIENT-SERVER-SYNC-SOLUTION.md](./SESSION-CLIENT-SERVER-SYNC-SOLUTION.md) - Solution pour la récupération de session

## 🏗️ Architecture Proposée

### Stack Technique

```
Frontend: Next.js 15 + React 18
État Client: Zustand
Cache & Données: TanStack Query
Authentification: Supabase Auth
Base de Données: Supabase (PostgreSQL)
ORM: Prisma (optionnel)
Realtime: Supabase Realtime + TanStack Query
```

### Architecture Globale

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Next.js       │    │   Client        │
│   Auth Server   │◄──►│   Server        │◄──►│   State         │
│   (Source)      │    │   (Middleware)  │    │   (Zustand)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   API Routes    │    │   TanStack      │
│   Database      │◄──►│   (Server)      │◄──►│   Query         │
│   (PostgreSQL)  │    │   (Prisma)      │    │   (Cache)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Principes Fondamentaux

### 1. Single Source of Truth

- **Session** : Gérée côté serveur uniquement
- **État Client** : Zustand pour l'UI et les états locaux
- **Données Serveur** : TanStack Query pour le cache et la synchronisation

### 2. Séparation des Responsabilités

- **Middleware** : Protection de routes basique
- **API Routes** : Logique métier et accès base de données
- **Client** : État UI et navigation

### 3. Performance Optimisée

- **Cache intelligent** : TanStack Query
- **Re-renders minimisés** : Zustand
- **Realtime optimisé** : Invalidation ciblée

## 📁 Structure des Fichiers

```
src/
├── lib/
│   ├── stores/
│   │   ├── auth-store.ts          # État d'authentification
│   │   ├── ui-store.ts            # État UI (loading, modals, etc.)
│   │   └── index.ts               # Export des stores
│   ├── queries/
│   │   ├── auth.ts                # Queries d'authentification
│   │   ├── organizations.ts       # Queries organisations
│   │   ├── establishments.ts      # Queries établissements
│   │   └── index.ts               # Export des queries
│   ├── realtime/
│   │   ├── realtime-client.ts     # Client Supabase Realtime
│   │   ├── realtime-hooks.ts      # Hooks pour TanStack Query
│   │   └── realtime-provider.tsx  # Provider React
│   └── supabase/
│       ├── client.ts              # Client Supabase
│       └── server.ts              # Client serveur
├── components/
│   ├── providers/
│   │   ├── auth-provider.tsx      # Provider d'authentification
│   │   ├── query-provider.tsx     # Provider TanStack Query
│   │   └── realtime-provider.tsx  # Provider Realtime
│   └── auth/
│       ├── login-form.tsx         # Formulaire de connexion
│       ├── protected-route.tsx    # Route protégée
│       └── auth-guard.tsx         # Guard d'authentification
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── me/route.ts        # Récupération utilisateur
│   │       ├── login/route.ts     # Connexion
│   │       └── logout/route.ts    # Déconnexion
│   └── middleware.ts              # Middleware simplifié
└── types/
    ├── auth.ts                    # Types d'authentification
    ├── database.ts                # Types base de données
    └── api.ts                     # Types API
```

## 🔧 Implémentation Détaillée

### 1. Store d'Authentification (Zustand)

```typescript
// lib/stores/auth-store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthState {
  // État
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // État initial
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session) => set({ session }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      reset: () =>
        set({
          user: null,
          session: null,
          isLoading: true,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-store",
    },
  ),
);
```

### 2. Queries d'Authentification (TanStack Query)

```typescript
// lib/queries/auth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";

// Query pour récupérer l'utilisateur
export const useUser = () => {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(user);
      setLoading(false);

      return user;
    },
    enabled: !!supabase.auth.getSession(), // Seulement si connecté
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Query pour récupérer les rôles
export const useUserRoles = (userId?: string) => {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.from("users_roles").select("role").eq("user_id", userId);

      if (error) throw error;
      return data?.map((ur) => ur.role) || [];
    },
    enabled: !!userId,
  });
};

// Mutation pour la connexion
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: (data) => {
      // Invalider et refetch les queries
      queryClient.invalidateQueries(["user"]);
      queryClient.invalidateQueries(["user-roles"]);
    },
  });
};

// Mutation pour la déconnexion
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Nettoyer le store et le cache
      logout();
      queryClient.clear();
    },
  });
};
```

### 3. Queries pour les Organisations

```typescript
// lib/queries/organizations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

// Query pour récupérer l'organisation de l'utilisateur
export const useUserOrganization = (userId?: string) => {
  return useQuery({
    queryKey: ["user-organization", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("users_organizations")
        .select(
          `
          organization_id,
          organizations (
            id,
            name,
            slug,
            logo_url,
            settings
          )
        `,
        )
        .eq("user_id", userId)
        .eq("deleted", false)
        .eq("organizations.deleted", false)
        .single();

      if (error) throw error;
      return data?.organizations || null;
    },
    enabled: !!userId,
  });
};

// Query pour récupérer toutes les organisations (system_admin)
export const useAllOrganizations = () => {
  return useQuery({
    queryKey: ["all-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("deleted", false).order("name");

      if (error) throw error;
      return data || [];
    },
  });
};

// Realtime pour les organisations
export const useOrganizationsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("organizations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organizations",
        },
        () => {
          // Invalider les queries d'organisations
          queryClient.invalidateQueries(["user-organization"]);
          queryClient.invalidateQueries(["all-organizations"]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);
};
```

### 4. Middleware Simplifié

```typescript
// app/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorer les assets statiques
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // Gestion de la localisation
  const pathnameHasLocale = /^\/(?:fr|en)(?:\/|$)/.test(pathname);
  if (!pathnameHasLocale) {
    const locale = "fr";
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // Extraire la locale et le chemin
  const locale = pathname.split("/")[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, "");

  // Routes publiques
  if (
    pathWithoutLocale.startsWith("/auth") ||
    pathWithoutLocale.startsWith("/unauthorized") ||
    pathWithoutLocale === "/"
  ) {
    return NextResponse.next();
  }

  // Protection des routes
  if (pathWithoutLocale.startsWith("/dashboard") || pathWithoutLocale.startsWith("/admin")) {
    const supabase = createClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL(`/${locale}/auth/login`, request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 5. API Routes

```typescript
// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les rôles de l'utilisateur
    const { data: roles, error: rolesError } = await supabase.from("users_roles").select("role").eq("user_id", user.id);

    if (rolesError) {
      return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
      roles: roles?.map((r) => r.role) || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### 6. Provider d'Authentification

```typescript
// components/providers/auth-provider.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUser } from '@/lib/queries/auth';
import { supabase } from '@/lib/supabase/client';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setSession, setLoading } = useAuthStore();
  const { data: user } = useUser();

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session);

        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);

  return <>{children}</>;
};
```

### 7. Route Protégée

```typescript
// components/auth/protected-route.tsx
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useUser } from '@/lib/queries/auth';
import { useUserRoles } from '@/lib/queries/auth';
import { useUserOrganization } from '@/lib/queries/organizations';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { data: user } = useUser();
  const { data: roles } = useUserRoles(user?.id);
  const { data: organization } = useUserOrganization(user?.id);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requiredRole && roles && !roles.includes(requiredRole)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, roles, requiredRole, router, redirectTo]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
```

### 8. Formulaire de Connexion

```typescript
// components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useLogin } from '@/lib/queries/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const { setUser, setSession } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await loginMutation.mutateAsync({ email, password });

      // Redirection basée sur le rôle
      if (result.user) {
        // Récupérer le rôle et rediriger
        const response = await fetch(`/api/auth/me`);
        if (response.ok) {
          const { roles } = await response.json();

          if (roles.includes('system_admin')) {
            router.push('/admin');
          } else if (roles.includes('org_admin')) {
            router.push('/dashboard');
          } else {
            router.push('/unauthorized');
          }
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
      />
      <button type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
};
```

## 🚀 Avantages de la Nouvelle Architecture

### Performance

- ✅ **Cache intelligent** : TanStack Query gère automatiquement le cache
- ✅ **Re-renders optimisés** : Zustand minimise les re-renders
- ✅ **Realtime optimisé** : Invalidation ciblée au lieu de refetch complet
- ✅ **Bundle size réduit** : Moins de dépendances

### Maintenabilité

- ✅ **Code plus simple** : API prévisible et facile à comprendre
- ✅ **Séparation claire** : Responsabilités bien définies
- ✅ **Tests plus faciles** : États prévisibles et isolés
- ✅ **Debugging excellent** : DevTools pour Zustand et TanStack Query

### Sécurité

- ✅ **Session serveur** : Validation côté serveur
- ✅ **RLS respecté** : Supabase gère automatiquement les permissions
- ✅ **Tokens sécurisés** : Gestion automatique des refresh tokens
- ✅ **Protection des routes** : Middleware + Route Guards

### Expérience Développeur

- ✅ **Hot reload** : Changements reflétés immédiatement
- ✅ **DevTools** : Debugging visuel excellent
- ✅ **TypeScript** : Support complet et type-safe
- ✅ **Documentation** : Écosystème mature et bien documenté

## 📊 Comparaison avec l'Architecture Actuelle

| Aspect          | LegendState (Actuel)    | Zustand + TanStack Query (Proposé) |
| --------------- | ----------------------- | ---------------------------------- |
| **Complexité**  | ❌ Complexe             | ✅ Simple                          |
| **Performance** | ❌ Re-renders multiples | ✅ Optimisé                        |
| **Debugging**   | ❌ Difficile            | ✅ Excellent                       |
| **Maintenance** | ❌ Difficile            | ✅ Facile                          |
| **Tests**       | ❌ Complexes            | ✅ Simples                         |
| **Bundle Size** | ❌ Gros                 | ✅ Optimisé                        |
| **Écosystème**  | ❌ Limité               | ✅ Mature                          |

## 🔄 Plan de Migration

### Phase 1 : Fondations (1-2 semaines)

1. Installer et configurer Zustand
2. Installer et configurer TanStack Query
3. Créer les stores de base
4. Migrer le middleware

### Phase 2 : Authentification (1 semaine)

1. Implémenter le store d'authentification
2. Créer les queries d'auth
3. Migrer le formulaire de connexion
4. Tester la connexion/déconnexion

### Phase 3 : Données (1-2 semaines)

1. Migrer les queries d'organisations
2. Implémenter le realtime
3. Migrer les composants existants
4. Optimiser les performances

### Phase 4 : Nettoyage (1 semaine)

1. Supprimer LegendState
2. Nettoyer le code
3. Ajouter les tests
4. Documentation finale

## 🎯 Conclusion

Cette nouvelle architecture apporte :

- **Simplicité** : Code plus facile à comprendre et maintenir
- **Performance** : Optimisations automatiques et cache intelligent
- **Fiabilité** : Moins de bugs et états prévisibles
- **Scalabilité** : Architecture extensible et modulaire

La combinaison **Zustand + TanStack Query + Supabase** est largement utilisée et recommandée dans l'écosystème React/Next.js, offrant une solution robuste et maintenable pour l'authentification et la gestion d'état.

---

_Document créé le 13 juillet 2025_
