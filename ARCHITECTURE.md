# Architecture Technique

## 🏗️ Vue d'ensemble

Ce projet utilise une architecture moderne basée sur Next.js 15 avec App Router, Supabase pour le backend, et une approche multi-tenant pour la gestion d'organisations.

## 📁 Structure du projet

```
src/
├── app/                          # App Router Next.js
│   ├── [locale]/                 # Internationalisation
│   │   ├── (dashboard)/          # Routes protégées
│   │   │   ├── admin/           # Pages d'administration
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   └── layout.tsx       # Layout avec sidebar
│   │   ├── (main)/              # Routes publiques
│   │   │   ├── auth/           # Pages d'authentification
│   │   │   └── layout.tsx      # Layout public
│   │   ├── (root)/              # Layout racine
│   │   │   └── page.tsx        # Page d'accueil
│   │   └── layout.tsx           # Layout avec providers
│   ├── api/                     # API Routes
│   │   ├── admin/              # Endpoints admin
│   │   └── auth/               # Endpoints auth
│   ├── error.tsx               # Page d'erreur globale
│   ├── layout.tsx              # Layout racine avec HTML/Body
│   └── globals.css             # Styles globaux
├── components/                  # Composants réutilisables
│   ├── ui/                     # Composants Shadcn/ui
│   ├── providers/              # Providers React
│   │   ├── auth-provider.tsx   # Gestion de l'authentification
│   │   ├── query-provider.tsx  # React Query
│   │   ├── realtime-provider.tsx # WebSockets
│   │   └── loading-provider.tsx # États de chargement
│   ├── realtime/               # Composants temps réel
│   └── data-table/             # Composants de tableaux
├── lib/                        # Utilitaires et services
│   ├── supabase/               # Configuration Supabase
│   │   ├── client.ts          # Client côté client
│   │   ├── server.ts          # Client côté serveur
│   │   └── database.types.ts  # Types générés
│   ├── services/               # Services métier
│   │   ├── auth-server.ts     # Auth côté serveur
│   │   ├── roleService.ts     # Gestion des rôles
│   │   └── realtime/          # Services temps réel
│   ├── stores/                 # Stores Zustand
│   │   ├── auth-store.ts      # État d'authentification
│   │   ├── realtime-store.ts  # État temps réel
│   │   └── ui-store.ts        # État de l'interface
│   └── utils.ts                # Utilitaires généraux
├── hooks/                      # Hooks personnalisés
│   ├── use-auth.ts            # Hook d'authentification
│   ├── use-realtime.ts        # Hook temps réel
│   └── use-user-metadata.ts   # Hook métadonnées utilisateur
├── i18n/                       # Internationalisation
│   ├── navigation.ts          # Traductions navigation
│   └── routing.ts             # Configuration des routes
└── middleware.ts               # Middleware Next.js
```

## 🔐 Système d'authentification

### Architecture en couches

```
┌─────────────────────────────────────┐
│           Middleware                │ ← Vérification des sessions
├─────────────────────────────────────┤
│         AuthProvider                │ ← État global d'auth
├─────────────────────────────────────┤
│        Auth Store (Zustand)         │ ← Persistance de l'état
├─────────────────────────────────────┤
│      Supabase Client                │ ← Communication avec Supabase
├─────────────────────────────────────┤
│         Supabase Auth               │ ← Service d'authentification
└─────────────────────────────────────┘
```

### Flux d'authentification

1. **Middleware** intercepte chaque requête
2. **Vérification** des cookies de session
3. **Récupération** de l'utilisateur depuis Supabase
4. **Mise à jour** du store d'authentification
5. **Redirection** si nécessaire

### Gestion des rôles

```typescript
enum UserRole {
  SYSTEM_ADMIN = "system_admin",
  ORG_ADMIN = "org_admin",
  USER = "user",
}
```

- **System Admin** : Accès complet à toutes les organisations
- **Org Admin** : Gestion de sa propre organisation
- **User** : Accès limité aux données de son organisation

## 🏢 Architecture multi-tenant

### Isolation des données

```sql
-- Exemple de politique RLS
CREATE POLICY "Users can only access their organization data" ON establishments
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = auth.uid()
  )
);
```

### Structure des organisations

```
organizations/
├── id (UUID)
├── name
├── slug
├── custom_domain
└── settings

users_organizations/
├── user_id (FK)
├── organization_id (FK)
└── role

establishments/
├── id
├── organization_id (FK)
├── name
└── data
```

## 🔄 Système temps réel

### Architecture WebSocket

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Database      │
│   (React)       │◄──►│   Realtime      │◄──►│   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Gestion des connexions

1. **Connexion automatique** au démarrage
2. **Reconnexion automatique** en cas de perte
3. **Gestion des erreurs** avec retry
4. **Nettoyage** des subscriptions

### Modules temps réel

```typescript
// Exemple de module
export const organizationsRealtime = {
  subscribeToChanges: (orgId: string) => {
    return supabase
      .channel(`organizations:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${orgId}`,
        },
        handleChange,
      )
      .subscribe();
  },
};
```

## 🌍 Internationalisation

### Structure des traductions

```
messages/
├── fr.json          # Français
├── en.json          # Anglais
└── es.json          # Espagnol
```

### Configuration des routes

```typescript
export const routing = {
  locales: ["fr", "en", "es"],
  defaultLocale: "fr",
  localePrefix: "always",
} as const;
```

### Utilisation dans les composants

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common');
  return <h1>{t('welcome')}</h1>;
}
```

## 📊 Gestion d'état

### Stores Zustand

#### Auth Store

```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}
```

#### Realtime Store

```typescript
interface RealtimeStore {
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  subscriptions: Map<string, RealtimeChannel>;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}
```

### React Query

```typescript
// Exemple de requête
const { data: organizations, isLoading } = useQuery({
  queryKey: ["organizations"],
  queryFn: () => getOrganizations(),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## 🔧 Configuration

### Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Next.js
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Application
NODE_ENV=production
```

### Configuration Supabase

```typescript
// Client côté client
export const createClient = () => {
  return createClientComponentClient<Database>({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
};

// Client côté serveur
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
};
```

## 🚀 Optimisations

### Performance

1. **Code splitting** automatique avec Next.js
2. **Lazy loading** des composants
3. **Mise en cache** avec React Query
4. **Optimisation des images** avec next/image

### Sécurité

1. **RLS** sur toutes les tables
2. **Validation** côté serveur
3. **Sanitisation** des inputs
4. **HTTPS** obligatoire en production

### Scalabilité

1. **Architecture modulaire**
2. **Services découplés**
3. **Cache distribué** (si nécessaire)
4. **Monitoring** et alertes

---

Cette architecture permet une maintenance facile, une évolution progressive et une scalabilité à long terme.
