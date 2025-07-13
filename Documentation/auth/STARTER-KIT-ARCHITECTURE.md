# 🚀 Starter Kit - Nouvelle Architecture d'Authentification

## 📋 Vue d'ensemble

Ce document détaille comment créer un starter kit complet avec la nouvelle architecture d'authentification basée sur **Zustand + TanStack Query + Supabase + next-intl**.

## 🛠️ Création du Starter Kit

### 1. Initialisation du Projet

```bash
# Créer un nouveau projet Next.js
npx create-next-app@latest my-auth-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Aller dans le dossier
cd my-auth-app

# Installer les dépendances principales
npm install zustand @tanstack/react-query @supabase/supabase-js next-intl
npm install @tanstack/react-query-devtools zustand/middleware

# Dépendances de développement
npm install -D @types/node
```

### 2. Configuration des Variables d'Environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Structure des Fichiers

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── admin/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── unauthorized/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   │       ├── me/
│   │       │   └── route.ts
│   │       ├── login/
│   │       │   └── route.ts
│   │       └── logout/
│   │           └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── middleware.ts
├── components/
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── protected-route.tsx
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   ├── query-provider.tsx
│   │   └── intl-provider.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       └── loading.tsx
├── lib/
│   ├── stores/
│   │   ├── auth-store.ts
│   │   ├── ui-store.ts
│   │   └── index.ts
│   ├── queries/
│   │   ├── auth.ts
│   │   ├── organizations.ts
│   │   └── index.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils/
│       └── auth.ts
├── messages/
│   ├── en.json
│   └── fr.json
├── types/
│   ├── auth.ts
│   ├── database.ts
│   └── api.ts
└── i18n/
    ├── navigation.ts
    └── routing.ts
```

## 🔧 Configuration Détaillée

### 1. Configuration next-intl

```typescript
// i18n/routing.ts
import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export const locales = ['fr', 'en'] as const;
export const defaultLocale = 'fr' as const;

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales,
});
```

```typescript
// i18n/navigation.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

### 2. Messages d'Internationalisation

```json
// messages/fr.json
{
  "auth": {
    "login": {
      "title": "Connexion",
      "email": "Email",
      "password": "Mot de passe",
      "submit": "Se connecter",
      "loading": "Connexion...",
      "error": "Erreur de connexion"
    },
    "register": {
      "title": "Inscription",
      "email": "Email",
      "password": "Mot de passe",
      "confirmPassword": "Confirmer le mot de passe",
      "submit": "S'inscrire",
      "loading": "Inscription...",
      "error": "Erreur d'inscription"
    }
  },
  "navigation": {
    "dashboard": "Tableau de bord",
    "admin": "Administration",
    "logout": "Déconnexion"
  },
  "common": {
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès"
  }
}
```

```json
// messages/en.json
{
  "auth": {
    "login": {
      "title": "Login",
      "email": "Email",
      "password": "Password",
      "submit": "Sign in",
      "loading": "Signing in...",
      "error": "Login error"
    },
    "register": {
      "title": "Register",
      "email": "Email",
      "password": "Password",
      "confirmPassword": "Confirm password",
      "submit": "Sign up",
      "loading": "Signing up...",
      "error": "Registration error"
    }
  },
  "navigation": {
    "dashboard": "Dashboard",
    "admin": "Admin",
    "logout": "Logout"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  }
}
```

### 3. Configuration Next.js

```typescript
// next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
```

### 4. Types TypeScript

```typescript
// types/auth.ts
export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  reset: () => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string;
}
```

```typescript
// types/database.ts
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  settings?: Record<string, any>;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'system_admin' | 'org_admin' | 'user';
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5. Store Zustand

```typescript
// lib/stores/auth-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AuthState } from '@/types/auth';

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // État initial
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setUser: user =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: session => set({ session }),

      setLoading: loading => set({ isLoading: loading }),

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
      name: 'auth-store',
    }
  )
);
```

```typescript
// lib/stores/ui-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  clearMessages: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      isLoading: false,
      error: null,
      success: null,

      setLoading: loading => set({ isLoading: loading }),
      setError: error => set({ error }),
      setSuccess: success => set({ success }),
      clearMessages: () => set({ error: null, success: null }),
    }),
    {
      name: 'ui-store',
    }
  )
);
```

### 6. Configuration Supabase

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

### 7. Queries TanStack Query

```typescript
// lib/queries/auth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { LoginCredentials, RegisterCredentials } from '@/types/auth';

// Query pour récupérer l'utilisateur
export const useUser = () => {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['user'],
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
    enabled: !!supabase.auth.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Query pour récupérer les rôles
export const useUserRoles = (userId?: string) => {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('users_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('deleted', false);

      if (error) throw error;
      return data?.map(ur => ur.role) || [];
    },
    enabled: !!userId,
  });
};

// Mutation pour la connexion
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: () => {
      // Invalider et refetch les queries
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['user-roles']);
    },
  });
};

// Mutation pour l'inscription
export const useRegister = () => {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const { data, error } = await supabase.auth.signUp(credentials);

      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['user-roles']);
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

### 8. Providers

```typescript
// components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
```

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

### 9. Composants UI

```typescript
// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
            'border border-input hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'underline-offset-4 hover:underline text-primary': variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

```typescript
// components/ui/input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

### 10. Formulaire de Connexion

```typescript
// components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLogin } from '@/lib/queries/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/lib/stores/ui-store';

export const LoginForm = () => {
  const t = useTranslations('auth.login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const { setUser, setSession } = useAuthStore();
  const { setError, setSuccess } = useUIStore();
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
      setError(t('error'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email')}
          required
        />
      </div>
      <div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('password')}
          required
        />
      </div>
      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full"
      >
        {loginMutation.isPending ? t('loading') : t('submit')}
      </Button>
    </form>
  );
};
```

### 11. Route Protégée

```typescript
// components/auth/protected-route.tsx
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useUser } from '@/lib/queries/auth';
import { useUserRoles } from '@/lib/queries/auth';
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

### 12. Middleware

```typescript
// app/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { locales, defaultLocale } from '@/i18n/routing';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorer les assets statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Gestion de la localisation
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = defaultLocale;
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // Extraire la locale et le chemin
  const locale = pathname.split('/')[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');

  // Routes publiques
  if (
    pathWithoutLocale.startsWith('/auth') ||
    pathWithoutLocale.startsWith('/unauthorized') ||
    pathWithoutLocale === '/'
  ) {
    return NextResponse.next();
  }

  // Protection des routes
  if (pathWithoutLocale.startsWith('/dashboard') || pathWithoutLocale.startsWith('/admin')) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL(`/${locale}/auth/login`, request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 13. Layout Principal

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Auth App',
  description: 'Application avec authentification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

### 14. Layout avec Locale

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

## 🚀 Scripts de Démarrage

### 1. Script d'Installation

```bash
#!/bin/bash
# install-starter.sh

echo "🚀 Installation du Starter Kit d'Authentification..."

# Créer le projet
npx create-next-app@latest my-auth-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes

cd my-auth-app

# Installer les dépendances
npm install zustand @tanstack/react-query @supabase/supabase-js next-intl
npm install @tanstack/react-query-devtools

# Créer la structure des dossiers
mkdir -p src/{components/{auth,providers,ui},lib/{stores,queries,supabase,utils},types,messages,i18n}

# Créer les fichiers de base
touch .env.local
touch src/lib/utils.ts

echo "✅ Installation terminée !"
echo "📝 N'oubliez pas de configurer vos variables d'environnement dans .env.local"
```

### 2. Configuration Base de Données

```sql
-- Script SQL pour créer les tables nécessaires

-- Table des organisations
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des rôles utilisateurs
CREATE TABLE users_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('system_admin', 'org_admin', 'user')),
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Table des relations utilisateurs-organisations
CREATE TABLE users_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- RLS (Row Level Security)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_organizations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Organizations are viewable by authenticated users" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own roles" ON users_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own organizations" ON users_organizations
  FOR SELECT USING (auth.uid() = user_id);
```

## 🎯 Utilisation du Starter Kit

### 1. Cloner et Configurer

```bash
# Cloner le projet
git clone <repository>
cd my-auth-app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase
```

### 2. Configurer Supabase

1. Créer un projet Supabase
2. Récupérer les clés d'API
3. Configurer les variables d'environnement
4. Exécuter le script SQL pour créer les tables

### 3. Démarrer le Développement

```bash
npm run dev
```

## 📋 Checklist de Démarrage

- [ ] Projet Next.js créé
- [ ] Dépendances installées
- [ ] Variables d'environnement configurées
- [ ] Structure des dossiers créée
- [ ] Fichiers de base créés
- [ ] Base de données configurée
- [ ] Tables créées
- [ ] RLS configuré
- [ ] Application démarrée
- [ ] Tests de connexion effectués

## 🎉 Avantages du Starter Kit

- ✅ **Architecture complète** : Zustand + TanStack Query + Supabase
- ✅ **Internationalisation** : next-intl intégré
- ✅ **TypeScript** : Types complets et type-safe
- ✅ **UI Components** : Composants de base inclus
- ✅ **Sécurité** : RLS et middleware configurés
- ✅ **Performance** : Cache et optimisations inclus
- ✅ **Développement** : DevTools et hot reload
- ✅ **Production Ready** : Configuration complète

Ce starter kit vous donne une base solide pour développer une application d'authentification moderne et performante !

---

_Document créé le 13 juillet 2025_
