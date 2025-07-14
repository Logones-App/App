# 🚀 Plan d'Implémentation - Espaces de Travail Centralisés avec Internationalisation

## 📋 **INFORMATIONS GÉNÉRALES**

- **Projet** : SaaS Dashboard Restaurant
- **Stack** : Next.js 15, Supabase, Zustand, TanStack Query, next-intl
- **Objectif** : Système d'espaces de travail centralisé, sécurisé et internationalisé
- **Timeline** : 13 jours (2 semaines)
- **Responsable** : Assistant IA + Utilisateur

---

## 🎯 **OBJECTIFS FINAUX**

### **✅ Critères de Succès**

- [ ] Pas de flash d'information entre les rôles
- [ ] Support complet des locales (fr, en, es)
- [ ] Sécurité renforcée avec validation des métadonnées
- [ ] Performance optimisée avec cache par rôle ET locale
- [ ] Tests complets avec couverture > 90%
- [ ] Documentation complète

---

## 📊 **SUIVI DE PROGRESSION GLOBAL**

### **Phase 1 : Fondations + Internationalisation (Jours 1-4)**

- **Progression actuelle** : 0%
- **Objectif** : 30%
- **Statut** : ⏳ En attente

### **Phase 2 : Sécurité (Jours 5-8)**

- **Progression actuelle** : 0%
- **Objectif** : 65%
- **Statut** : ⏳ En attente

### **Phase 3 : UX/Performance (Jours 9-11)**

- **Progression actuelle** : 0%
- **Objectif** : 90%
- **Statut** : ⏳ En attente

### **Phase 4 : Tests/Validation (Jours 12-13)**

- **Progression actuelle** : 0%
- **Objectif** : 100%
- **Statut** : ⏳ En attente

---

## 🏗️ **PHASE 1 : FONDATIONS + INTERNATIONALISATION (Jours 1-4)**

### **📊 Progression : 0% → 30%**

#### **Étape 1.1 : Configuration Next-intl (Jour 1)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-6 heures

**Tâches détaillées :**

- [ ] Créer le fichier `src/i18n.ts`
- [ ] Configurer le middleware avec next-intl
- [ ] Créer la structure des dossiers `[locale]`
- [ ] Tester la redirection automatique vers locale par défaut
- [ ] Vérifier le support des locales fr, en, es

**Fichiers à créer/modifier :**

```typescript
// src/i18n.ts
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["fr", "en", "es"];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
```

**Critères de validation :**

- [ ] Configuration next-intl fonctionnelle
- [ ] Middleware de locale actif
- [ ] Redirection automatique vers locale par défaut
- [ ] Support des locales fr, en, es
- [ ] Tests de base passent

**Notes importantes :**

- Vérifier que le middleware ne bloque pas les API routes
- S'assurer que les redirections conservent la locale
- Tester avec différentes locales

---

#### **Étape 1.2 : Structure des Locales (Jour 1)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 2-3 heures

**Tâches détaillées :**

- [ ] Créer `src/locales/fr.json`
- [ ] Créer `src/locales/en.json`
- [ ] Créer `src/locales/es.json`
- [ ] Vérifier la cohérence entre les fichiers
- [ ] Tester les traductions

**Structure des fichiers :**

```json
// src/locales/fr.json
{
  "navigation": {
    "dashboard": "Tableau de bord",
    "organizations": "Organisations",
    "users": "Utilisateurs",
    "establishments": "Établissements",
    "team": "Équipe",
    "settings": "Paramètres",
    "system": "Système"
  },
  "roles": {
    "system_admin": "Administrateur Système",
    "org_admin": "Administrateur Organisation",
    "user": "Utilisateur"
  },
  "loading": {
    "system_admin": "Chargement de l'espace administrateur...",
    "org_admin": "Chargement de votre espace de travail...",
    "generic": "Chargement..."
  },
  "workspace": {
    "welcome": "Bienvenue dans votre espace de travail",
    "system_overview": "Vue d'ensemble du système",
    "org_overview": "Vue d'ensemble de votre organisation"
  }
}
```

**Critères de validation :**

- [ ] Fichiers de traduction complets
- [ ] Structure cohérente entre locales
- [ ] Traductions pour tous les rôles
- [ ] Messages d'erreur traduits
- [ ] Pas de clés manquantes

**Notes importantes :**

- Maintenir la cohérence entre les trois langues
- Utiliser des clés descriptives
- Prévoir les messages d'erreur

---

#### **Étape 1.3 : Hook Workspace Internationalisé (Jour 2)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/hooks/use-workspace.ts`
- [ ] Intégrer la locale dans le hook
- [ ] Gérer les états de chargement
- [ ] Optimiser les re-renders
- [ ] Ajouter les types TypeScript

**Code principal :**

```typescript
// src/hooks/use-workspace.ts
import { useLocale } from "next-intl";
import { useUser } from "@/hooks/use-user";
import { useUserMetadata } from "@/hooks/use-user-metadata";

export function useWorkspace() {
  const { user, isLoading } = useUser();
  const { data: userMetadata } = useUserMetadata();
  const locale = useLocale();

  return useMemo(() => {
    if (isLoading || !user || !userMetadata) {
      return {
        isLoading: true,
        role: null,
        type: null,
        locale,
        user: null,
        organizations: [],
        permissions: [],
        features: [],
        preferences: {},
      };
    }

    const role = userMetadata.app_metadata?.role;
    const type = role === "system_admin" ? "system" : "organization";

    return {
      isLoading: false,
      user,
      role,
      type,
      locale,
      organizations: userMetadata.organizations || [],
      permissions: userMetadata.app_metadata?.permissions || [],
      features: userMetadata.app_metadata?.features || [],
      preferences: userMetadata.user_metadata?.preferences || {},
    };
  }, [user, userMetadata, isLoading, locale]);
}
```

**Critères de validation :**

- [ ] Hook retourne les bonnes données avec locale
- [ ] Pas de re-renders inutiles
- [ ] Gestion des états de chargement
- [ ] Types TypeScript stricts
- [ ] Locale intégrée dans le workspace
- [ ] Performance optimisée

**Notes importantes :**

- Vérifier que la locale est toujours disponible
- Optimiser les dépendances du useMemo
- Gérer les cas d'erreur

---

#### **Étape 1.4 : Store Zustand Internationalisé (Jour 2)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 2-3 heures

**Tâches détaillées :**

- [ ] Créer `src/stores/workspace-store.ts`
- [ ] Intégrer la persistance de la locale
- [ ] Synchroniser avec le hook
- [ ] Gérer les erreurs
- [ ] Optimiser la performance

**Code principal :**

```typescript
// src/stores/workspace-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceStore {
  workspace: Workspace | null;
  isLoading: boolean;
  locale: string;
  setWorkspace: (workspace: Workspace) => void;
  clearWorkspace: () => void;
  setLocale: (locale: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspace: null,
      isLoading: true,
      locale: "fr",
      setWorkspace: (workspace) => set({ workspace, isLoading: false }),
      clearWorkspace: () => set({ workspace: null, isLoading: true }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
```

**Critères de validation :**

- [ ] Store synchronisé avec le hook
- [ ] Persistance de la locale
- [ ] Gestion des erreurs
- [ ] Performance optimisée
- [ ] Pas de fuites mémoire

**Notes importantes :**

- Ne persister que la locale, pas les données sensibles
- Gérer la synchronisation avec le hook
- Vérifier la performance

---

#### **Étape 1.5 : Composants de Protection Internationalisés (Jour 3)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/components/auth/role-gate.tsx`
- [ ] Intégrer les traductions
- [ ] Gérer les états de chargement
- [ ] Optimiser les fallbacks
- [ ] Ajouter les types stricts

**Code principal :**

```typescript
// src/components/auth/role-gate.tsx
import { useTranslations } from 'next-intl';

interface RoleGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  strict?: boolean;
}

export function RoleGate({
  allowedRoles,
  children,
  fallback = null,
  strict = true
}: RoleGateProps) {
  const workspace = useWorkspace();
  const t = useTranslations('loading');

  if (workspace.isLoading) {
    return <SecureLoadingSpinner message={t('generic')} />;
  }

  if (!workspace.role || !allowedRoles.includes(workspace.role)) {
    return fallback;
  }

  return <>{children}</>;
}
```

**Critères de validation :**

- [ ] Protection stricte sans flash
- [ ] Loading states traduits
- [ ] Fallback configurable
- [ ] Types stricts
- [ ] Performance optimisée

**Notes importantes :**

- S'assurer qu'il n'y a pas de flash d'information
- Optimiser les re-renders
- Gérer tous les cas d'erreur

---

#### **Étape 1.6 : Layouts Adaptatifs Internationalisés (Jour 3-4)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-5 heures

**Tâches détaillées :**

- [ ] Créer `src/components/layout/adaptive-layout.tsx`
- [ ] Créer `src/components/layout/system-admin-layout.tsx`
- [ ] Créer `src/components/layout/org-admin-layout.tsx`
- [ ] Intégrer les traductions
- [ ] Optimiser les transitions

**Code principal :**

```typescript
// src/components/layout/adaptive-layout.tsx
import { useTranslations } from 'next-intl';

export function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  const workspace = useWorkspace();
  const t = useTranslations('loading');

  if (workspace.isLoading) {
    return <SecureLoadingSpinner message={t('generic')} />;
  }

  if (workspace.type === 'system') {
    return (
      <SystemAdminLayout locale={workspace.locale}>
        {children}
      </SystemAdminLayout>
    );
  }

  return (
    <OrgAdminLayout locale={workspace.locale}>
      {children}
    </OrgAdminLayout>
  );
}
```

**Critères de validation :**

- [ ] Pas de flash entre layouts
- [ ] Transitions fluides
- [ ] Responsive design
- [ ] Accessibilité
- [ ] Locale passée aux layouts

**Notes importantes :**

- Utiliser des transitions CSS pour éviter les flashs
- S'assurer que les layouts sont responsive
- Tester l'accessibilité

---

## 🔒 **PHASE 2 : SÉCURITÉ (Jours 5-8)**

### **📊 Progression : 30% → 65%**

#### **Étape 2.1 : Middleware Sécurisé Internationalisé (Jour 5)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-5 heures

**Tâches détaillées :**

- [ ] Modifier `src/middleware.ts`
- [ ] Intégrer la logique de sécurité
- [ ] Gérer les redirections avec locale
- [ ] Ajouter les logs de sécurité
- [ ] Optimiser la performance

**Code principal :**

```typescript
// src/middleware.ts - Sécurité + Internationalisation
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["fr", "en", "es"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export default async function middleware(request: NextRequest) {
  // Appliquer le middleware d'internationalisation
  const response = intlMiddleware(request);

  // Ajouter la logique de sécurité
  const { pathname } = request.nextUrl;
  const user = await getCurrentUser(request);

  // Extraire la locale de l'URL
  const locale = pathname.split("/")[1];

  // Protection immédiate des routes sensibles
  if (pathname.includes("/admin")) {
    const isSystemAdmin = user?.app_metadata?.role === "system_admin";
    if (!isSystemAdmin) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  if (pathname.includes("/dashboard")) {
    const isSystemAdmin = user?.app_metadata?.role === "system_admin";
    if (isSystemAdmin) {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Critères de validation :**

- [ ] Redirection immédiate avec locale
- [ ] Pas de flash d'information
- [ ] Logs de sécurité
- [ ] Performance optimisée
- [ ] Support de toutes les locales

**Notes importantes :**

- Tester avec toutes les locales
- Vérifier que les redirections conservent la locale
- Ajouter des logs pour le debugging

---

#### **Étape 2.2 : Validation des Métadonnées Internationalisée (Jour 5-6)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/lib/security/metadata-validator.ts`
- [ ] Intégrer les traductions
- [ ] Ajouter la validation stricte
- [ ] Gérer les cas d'erreur
- [ ] Ajouter les logs

**Code principal :**

```typescript
// src/lib/security/metadata-validator.ts
import { getRoleLabel } from "@/lib/i18n/role-labels";

export class MetadataValidator {
  static validateUserMetadata(user: User, locale: string): boolean {
    const appRole = user.app_metadata?.role;
    const userRole = user.user_metadata?.role;

    // Priorité à app_metadata (sécurisé)
    if (appRole && userRole && appRole !== userRole) {
      console.warn(
        `Incohérence détectée dans les métadonnées utilisateur: ${getRoleLabel(appRole, locale)} vs ${getRoleLabel(userRole, locale)}`,
      );
      return false;
    }

    return true;
  }

  static sanitizeMetadata(user: User, locale: string): User {
    // Nettoyer les métadonnées sensibles
    const sanitized = { ...user };
    delete sanitized.user_metadata?.password;

    // Valider la locale
    if (!["fr", "en", "es"].includes(locale)) {
      sanitized.user_metadata = {
        ...sanitized.user_metadata,
        preferences: {
          ...sanitized.user_metadata?.preferences,
          language: "fr", // Locale par défaut
        },
      };
    }

    return sanitized;
  }
}
```

**Critères de validation :**

- [ ] Validation stricte des métadonnées
- [ ] Détection des incohérences avec traductions
- [ ] Sanitisation automatique
- [ ] Logs de sécurité
- [ ] Validation de la locale

**Notes importantes :**

- Toujours prioriser app_metadata sur user_metadata
- Logguer toutes les incohérences
- Sanitiser les données sensibles

---

#### **Étape 2.3 : Protection des Composants Internationalisée (Jour 6-7)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/components/security/secure-component.tsx`
- [ ] Intégrer les traductions
- [ ] Optimiser les re-renders
- [ ] Gérer les fallbacks
- [ ] Ajouter les types

**Code principal :**

```typescript
// src/components/security/secure-component.tsx
import { useTranslations } from 'next-intl';

interface SecureComponentProps {
  component: React.ComponentType<any>;
  requiredRole: string;
  fallback?: React.ReactNode;
}

export function SecureComponent({
  component: Component,
  requiredRole,
  fallback
}: SecureComponentProps) {
  const workspace = useWorkspace();
  const t = useTranslations('loading');

  if (workspace.isLoading) {
    return <SecureLoadingSpinner message={t('generic')} />;
  }

  if (workspace.role !== requiredRole) {
    return fallback || null;
  }

  return <Component locale={workspace.locale} />;
}
```

**Critères de validation :**

- [ ] Protection au niveau composant
- [ ] Pas de rendu conditionnel visible
- [ ] Fallback configurable
- [ ] Performance optimisée
- [ ] Locale passée aux composants

**Notes importantes :**

- S'assurer qu'il n'y a pas de flash
- Optimiser les re-renders
- Gérer tous les cas d'erreur

---

#### **Étape 2.4 : Gestion des Sessions Internationalisée (Jour 7-8)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/lib/security/session-manager.ts`
- [ ] Intégrer les traductions
- [ ] Ajouter la validation automatique
- [ ] Gérer le refresh automatique
- [ ] Ajouter les logs

**Code principal :**

```typescript
// src/lib/security/session-manager.ts
import { getRoleLabel } from "@/lib/i18n/role-labels";

export class SessionManager {
  static async validateSession(user: User, locale: string): Promise<boolean> {
    const lastUpdate = user.app_metadata?.last_role_update;
    if (!lastUpdate) return false;

    const sessionAge = Date.now() - new Date(lastUpdate).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24h

    if (sessionAge > maxAge) {
      console.log(`Session expirée pour ${getRoleLabel(user.app_metadata?.role, locale)}`);
      await this.refreshSession();
      return false;
    }

    return true;
  }

  static async refreshSession(): Promise<void> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Session refresh failed");
    }
  }
}
```

**Critères de validation :**

- [ ] Validation automatique des sessions
- [ ] Refresh automatique
- [ ] Gestion des erreurs
- [ ] Logs de sécurité
- [ ] Messages traduits

**Notes importantes :**

- Valider les sessions régulièrement
- Gérer les erreurs de refresh
- Logguer les expirations

---

## ⚡ **PHASE 3 : UX/PERFORMANCE (Jours 9-11)**

### **📊 Progression : 65% → 90%**

#### **Étape 3.1 : Navigation Intelligente Internationalisée (Jour 9)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-5 heures

**Tâches détaillées :**

- [ ] Créer `src/components/navigation/smart-navigation.tsx`
- [ ] Intégrer les traductions
- [ ] Optimiser les re-renders
- [ ] Gérer les URLs avec locale
- [ ] Ajouter l'accessibilité

**Code principal :**

```typescript
// src/components/navigation/smart-navigation.tsx
import { useTranslations } from 'next-intl';

export function SmartNavigation() {
  const workspace = useWorkspace();
  const t = useTranslations('navigation');

  const navigationItems = useMemo(() => {
    if (!workspace || workspace.isLoading) return [];

    const baseItems = [
      {
        label: t('dashboard'),
        href: `/${workspace.locale}/dashboard`,
        icon: Home
      },
    ];

    if (workspace.type === 'system') {
      return [
        ...baseItems,
        {
          label: t('organizations'),
          href: `/${workspace.locale}/admin/organizations`,
          icon: Building2
        },
        {
          label: t('users'),
          href: `/${workspace.locale}/admin/users`,
          icon: Users
        },
        {
          label: t('system'),
          href: `/${workspace.locale}/admin/system`,
          icon: Settings
        },
      ];
    }

    return [
      ...baseItems,
      {
        label: t('establishments'),
        href: `/${workspace.locale}/dashboard/establishments`,
        icon: Store
      },
      {
        label: t('team'),
        href: `/${workspace.locale}/dashboard/team`,
        icon: Users
      },
      {
        label: t('settings'),
        href: `/${workspace.locale}/dashboard/settings`,
        icon: Settings
      },
    ];
  }, [workspace, t]);

  return <NavigationMenu items={navigationItems} />;
}
```

**Critères de validation :**

- [ ] Navigation adaptative avec traductions
- [ ] Performance optimisée
- [ ] UX fluide
- [ ] Accessibilité
- [ ] URLs avec locale

**Notes importantes :**

- Optimiser les re-renders avec useMemo
- S'assurer que les URLs incluent la locale
- Tester l'accessibilité

---

#### **Étape 3.2 : Cache Optimisé Internationalisé (Jour 9-10)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/hooks/use-secure-query.ts`
- [ ] Intégrer la locale dans le cache
- [ ] Optimiser les invalidations
- [ ] Gérer les erreurs
- [ ] Ajouter les types

**Code principal :**

```typescript
// src/hooks/use-secure-query.ts
export function useSecureQuery<T>(queryKey: string[], fetcher: () => Promise<T>, options?: QueryOptions) {
  const workspace = useWorkspace();

  return useQuery({
    queryKey: [...queryKey, workspace?.role, workspace?.locale],
    queryFn: fetcher,
    enabled: !!workspace && !workspace.isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}
```

**Critères de validation :**

- [ ] Cache par rôle ET locale
- [ ] Invalidation intelligente
- [ ] Performance optimisée
- [ ] Gestion des erreurs
- [ ] Types stricts

**Notes importantes :**

- Inclure la locale dans la clé de cache
- Optimiser les temps de stale/gc
- Gérer les cas d'erreur

---

#### **Étape 3.3 : Loading States Adaptatifs Internationalisés (Jour 10)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 2-3 heures

**Tâches détaillées :**

- [ ] Créer `src/components/ui/adaptive-loading.tsx`
- [ ] Intégrer les traductions
- [ ] Optimiser les transitions
- [ ] Gérer les cas d'erreur
- [ ] Ajouter l'accessibilité

**Code principal :**

```typescript
// src/components/ui/adaptive-loading.tsx
import { useTranslations } from 'next-intl';

export function AdaptiveLoading() {
  const workspace = useWorkspace();
  const t = useTranslations('loading');

  if (workspace.type === 'system') {
    return <SystemAdminLoading message={t('system_admin')} />;
  }

  return <OrgAdminLoading message={t('org_admin')} />;
}
```

**Critères de validation :**

- [ ] Loading adaptatif avec traductions
- [ ] Pas d'info sensible
- [ ] UX cohérente
- [ ] Performance
- [ ] Accessibilité

**Notes importantes :**

- Ne pas exposer d'informations sensibles
- Utiliser des transitions fluides
- Tester l'accessibilité

---

#### **Étape 3.4 : Responsive + Rôles + Internationalisation (Jour 10-11)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/components/responsive/role-responsive.tsx`
- [ ] Intégrer les traductions
- [ ] Gérer le responsive design
- [ ] Optimiser les re-renders
- [ ] Ajouter l'accessibilité

**Code principal :**

```typescript
// src/components/responsive/role-responsive.tsx
import { useTranslations } from 'next-intl';

export function RoleResponsive({
  mobile,
  desktop,
  role
}: RoleResponsiveProps) {
  const workspace = useWorkspace();
  const isMobile = useIsMobile();
  const t = useTranslations('roles');

  if (workspace.role !== role) {
    return null;
  }

  const Component = isMobile ? mobile : desktop;
  return <Component locale={workspace.locale} roleLabel={t(role)} />;
}
```

**Critères de validation :**

- [ ] Responsive par rôle avec traductions
- [ ] Performance optimisée
- [ ] UX cohérente
- [ ] Accessibilité
- [ ] Labels de rôles traduits

**Notes importantes :**

- Gérer les breakpoints responsive
- Optimiser les re-renders
- Tester sur différents appareils

---

## 🧪 **PHASE 4 : TESTS/VALIDATION (Jours 12-13)**

### **📊 Progression : 90% → 100%**

#### **Étape 4.1 : Tests Unitaires Internationalisés (Jour 12)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-5 heures

**Tâches détaillées :**

- [ ] Créer `src/__tests__/hooks/use-workspace.test.ts`
- [ ] Créer `src/__tests__/components/auth/role-gate.test.ts`
- [ ] Créer `src/__tests__/navigation/smart-navigation.test.ts`
- [ ] Tester avec toutes les locales
- [ ] Ajouter les mocks

**Code principal :**

```typescript
// src/__tests__/hooks/use-workspace.test.ts
describe('useWorkspace', () => {
  it('should return correct workspace for system_admin with locale', () => {
    const mockUser = createMockUser('system_admin');
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }) => (
        <IntlProvider locale="fr">
          <UserProvider user={mockUser}>{children}</UserProvider>
        </IntlProvider>
      ),
    });

    expect(result.current.role).toBe('system_admin');
    expect(result.current.type).toBe('system');
    expect(result.current.locale).toBe('fr');
  });

  it('should handle locale changes', () => {
    const mockUser = createMockUser('org_admin');
    const { result, rerender } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }) => (
        <IntlProvider locale="en">
          <UserProvider user={mockUser}>{children}</UserProvider>
        </IntlProvider>
      ),
    });

    expect(result.current.locale).toBe('en');
  });
});
```

**Critères de validation :**

- [ ] Tests pour tous les rôles avec locales
- [ ] Tests de sécurité
- [ ] Tests de performance
- [ ] Couverture > 90%
- [ ] Tests de changement de locale

**Notes importantes :**

- Tester avec toutes les locales
- Mocker les traductions
- Vérifier la couverture

---

#### **Étape 4.2 : Tests d'Intégration Internationalisés (Jour 12-13)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 4-5 heures

**Tâches détaillées :**

- [ ] Créer `src/__tests__/integration/workspace-flow.test.ts`
- [ ] Créer `src/__tests__/integration/navigation-flow.test.ts`
- [ ] Créer `src/__tests__/integration/security-flow.test.ts`
- [ ] Tester avec toutes les locales
- [ ] Ajouter les tests E2E

**Code principal :**

```typescript
// src/__tests__/integration/workspace-flow.test.ts
describe('Workspace Flow with Internationalization', () => {
  it('should redirect system_admin to /fr/admin', async () => {
    const { getByText } = render(<App />);

    // Simuler login system_admin
    await userEvent.click(getByText('Login'));

    // Vérifier redirection avec locale
    expect(window.location.pathname).toBe('/fr/admin');
  });

  it('should handle locale switching', async () => {
    const { getByText } = render(<App />);

    // Changer de locale
    await userEvent.click(getByText('EN'));

    // Vérifier changement d'URL
    expect(window.location.pathname).toContain('/en/');
  });
});
```

**Critères de validation :**

- [ ] Tests de flux complets avec locales
- [ ] Tests de sécurité
- [ ] Tests de performance
- [ ] Tests d'accessibilité
- [ ] Tests de changement de langue

**Notes importantes :**

- Tester tous les flux utilisateur
- Vérifier la sécurité
- Tester l'accessibilité

---

#### **Étape 4.3 : Validation Finale Internationalisée (Jour 13)**

**Statut** : ⏳ En attente
**Responsable** : Assistant IA
**Temps estimé** : 3-4 heures

**Tâches détaillées :**

- [ ] Créer `src/lib/validation/workspace-validator.ts`
- [ ] Ajouter la validation d'internationalisation
- [ ] Créer le rapport final
- [ ] Documenter les résultats
- [ ] Créer les recommandations

**Code principal :**

```typescript
// src/lib/validation/workspace-validator.ts
export class WorkspaceValidator {
  static validateCompleteSetup(): ValidationResult {
    const checks = [
      this.validateSecurity(),
      this.validatePerformance(),
      this.validateUX(),
      this.validateAccessibility(),
      this.validateInternationalization(), // Nouveau
    ];

    return {
      isValid: checks.every((check) => check.isValid),
      errors: checks.flatMap((check) => check.errors),
    };
  }

  static validateInternationalization(): ValidationCheck {
    const locales = ["fr", "en", "es"];
    const errors = [];

    // Vérifier que toutes les locales sont supportées
    for (const locale of locales) {
      try {
        const messages = require(`../locales/${locale}.json`);
        if (!messages.navigation || !messages.roles) {
          errors.push(`Missing translations for locale: ${locale}`);
        }
      } catch (error) {
        errors.push(`Locale file missing: ${locale}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

**Critères de validation :**

- [ ] Validation complète avec internationalisation
- [ ] Rapport détaillé
- [ ] Recommandations
- [ ] Documentation
- [ ] Validation des traductions

**Notes importantes :**

- Vérifier toutes les locales
- Documenter les résultats
- Créer des recommandations

---

## 📊 **MÉTRIQUES DE SUIVI DÉTAILLÉES**

### **🎯 Indicateurs de Performance**

| Métrique                   | Objectif | Actuel | Statut       |
| -------------------------- | -------- | ------ | ------------ |
| **Temps de chargement**    | < 2s     | -      | ⏳ À mesurer |
| **Temps de transition**    | < 300ms  | -      | ⏳ À mesurer |
| **Couverture de tests**    | > 90%    | -      | ⏳ À mesurer |
| **Performance Lighthouse** | > 90     | -      | ⏳ À mesurer |
| **Accessibilité**          | 100%     | -      | ⏳ À mesurer |

### **🔒 Indicateurs de Sécurité**

| Métrique                   | Objectif | Actuel | Statut       |
| -------------------------- | -------- | ------ | ------------ |
| **Flash d'information**    | 0        | -      | ⏳ À mesurer |
| **Vulnérabilités**         | 0        | -      | ⏳ À mesurer |
| **Validation métadonnées** | 100%     | -      | ⏳ À mesurer |
| **Sessions sécurisées**    | 100%     | -      | ⏳ À mesurer |

### **🌐 Indicateurs d'Internationalisation**

| Métrique                  | Objectif       | Actuel | Statut       |
| ------------------------- | -------------- | ------ | ------------ |
| **Locales supportées**    | 3 (fr, en, es) | -      | ⏳ À mesurer |
| **Traductions complètes** | 100%           | -      | ⏳ À mesurer |
| **URLs avec locale**      | 100%           | -      | ⏳ À mesurer |
| **Changement de langue**  | Fonctionnel    | -      | ⏳ À mesurer |

---

## 🎯 **POINTS DE CONTRÔLE CRITIQUES**

### **Phase 1 - Fondations**

- [ ] Configuration next-intl fonctionnelle
- [ ] Hook workspace avec locale
- [ ] Store Zustand synchronisé
- [ ] Composants de protection sans flash
- [ ] Layouts adaptatifs

### **Phase 2 - Sécurité**

- [ ] Middleware sécurisé avec locale
- [ ] Validation des métadonnées
- [ ] Protection des composants
- [ ] Gestion des sessions
- [ ] Logs de sécurité

### **Phase 3 - UX/Performance**

- [ ] Navigation intelligente
- [ ] Cache optimisé
- [ ] Loading states adaptatifs
- [ ] Responsive design
- [ ] Performance optimisée

### **Phase 4 - Tests/Validation**

- [ ] Tests unitaires complets
- [ ] Tests d'intégration
- [ ] Validation finale
- [ ] Documentation
- [ ] Recommandations

---

## 📝 **NOTES IMPORTANTES**

### **⚠️ Risques Identifiés**

1. **Flash d'information** - Priorité MAXIMALE
2. **Performance** - Cache par rôle ET locale
3. **Sécurité** - Validation stricte des métadonnées
4. **Internationalisation** - Support complet des locales
5. **Tests** - Couverture complète

### **✅ Bonnes Pratiques**

1. **Commiter régulièrement** - Après chaque étape
2. **Tester continuellement** - À chaque modification
3. **Documenter** - Chaque décision importante
4. **Optimiser** - Performance et UX
5. **Sécuriser** - Validation à tous les niveaux

### **🔄 Révisions Planifiées**

- **Jour 4** : Révision Phase 1
- **Jour 8** : Révision Phase 2
- **Jour 11** : Révision Phase 3
- **Jour 13** : Révision finale

---

## 🎉 **CRITÈRES DE SUCCÈS FINAL**

### **✅ Fonctionnel**

- [ ] Système d'espaces de travail centralisé
- [ ] Support complet de l'internationalisation
- [ ] Sécurité renforcée
- [ ] Performance optimisée

### **✅ Qualité**

- [ ] Tests complets (> 90% couverture)
- [ ] Documentation complète
- [ ] Code maintenable
- [ ] Accessibilité

### **✅ Expérience Utilisateur**

- [ ] Pas de flash d'information
- [ ] Transitions fluides
- [ ] Interface adaptative
- [ ] Support multilingue

---

**📅 Dernière mise à jour :** [Date à remplir]
**👤 Responsable :** Assistant IA + Utilisateur
**📊 Progression globale :** 0% → 100%
