# 🏗️ Système de Rôles et Structure Complète

## 🎯 **SYSTÈME DE RÔLES ACTUEL**

### **Hiérarchie des Rôles**

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

3. user (Niveau Utilisateur) - FUTUR
   ├── Accès limité aux fonctionnalités assignées
   ├── Permissions granulaires via user_features
   └── Accès à certains restaurants selon les permissions
```

### **Tables de Base de Données**

#### **`users_roles` - Rôles Principaux**

```sql
CREATE TABLE users_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system_admin', 'org_admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

#### **`users_organizations` - Appartenances**

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

#### **`user_features` - Permissions Granulaires**

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

## 🔧 **IMPLÉMENTATION ACTUELLE**

### **Composants de Protection Implémentés**

#### **SystemAdminOnly.tsx**

```typescript
// src/components/auth/SystemAdminOnly.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/legendstate/auth/auth';
import { roleService } from '@/lib/services/roleService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface SystemAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SystemAdminOnly({ children, fallback }: SystemAdminOnlyProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkSystemAdminAccess = async () => {
      if (authLoading || !user) return;

      try {
        const isSystemAdmin = await roleService.isSystemAdmin(user.id);

        if (!isSystemAdmin) {
          console.log('🚫 Accès refusé : utilisateur non system_admin');
          router.push('/fr/dashboard');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des permissions:', error);
        router.push('/fr/dashboard');
      }
    };

    checkSystemAdminAccess();
  }, [user, authLoading, router]);

  // Pendant le chargement, afficher un loader
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si pas d'utilisateur, rediriger vers login
  if (!user) {
    router.push('/fr/auth/login');
    return null;
  }

  return <>{children}</>;
}
```

#### **OrgAdminOnly.tsx**

```typescript
// src/components/auth/OrgAdminOnly.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/legendstate/auth/auth';
import { roleService } from '@/lib/services/roleService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

interface OrgAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OrgAdminOnly({ children, fallback }: OrgAdminOnlyProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkOrgAdminAccess = async () => {
      if (authLoading || !user) return;

      try {
        const isSystemAdmin = await roleService.isSystemAdmin(user.id);
        const isOrgAdmin = await roleService.isOrgAdmin(user.id);

        if (isSystemAdmin) {
          console.log('🔄 System admin redirigé vers /admin');
          router.push('/fr/admin');
          return;
        }

        if (!isOrgAdmin) {
          console.log('🚫 Accès refusé : utilisateur non org_admin');
          router.push('/fr/unauthorized');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des permissions:', error);
        router.push('/fr/unauthorized');
      }
    };

    checkOrgAdminAccess();
  }, [user, authLoading, router]);

  // Pendant le chargement, afficher un loader
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si pas d'utilisateur, rediriger vers login
  if (!user) {
    router.push('/fr/auth/login');
    return null;
  }

  return <>{children}</>;
}
```

### **Service de Gestion des Rôles**

#### **roleService.ts**

```typescript
// src/lib/services/roleService.ts
import { createClient } from '@/lib/supabase/client';

export class RoleService {
  private static supabase = createClient();

  static async isSystemAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'system_admin')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification system_admin:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erreur lors de la vérification system_admin:', error);
      return false;
    }
  }

  static async isOrgAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'org_admin')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification org_admin:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erreur lors de la vérification org_admin:', error);
      return false;
    }
  }

  static async getUserRole(userId: string): Promise<'system_admin' | 'org_admin' | 'user' | null> {
    try {
      const { data, error } = await this.supabase
        .from('users_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role', { ascending: false }) // system_admin en premier
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération du rôle:', error);
        return null;
      }

      return data?.role || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du rôle:', error);
      return null;
    }
  }
}

export const roleService = new RoleService();
```

---

## 📁 **STRUCTURE COMPLÈTE DES FICHIERS**

### **Organisation par Fonctionnalité**

```
src/
├── app/
│   └── [locale]/
│       ├── auth/                    # Authentification
│       │   ├── login/               # Connexion
│       │   │   └── page.tsx         # Page de connexion
│       │   ├── register/            # Inscription
│       │   │   └── page.tsx         # Page d'inscription
│       │   └── forgot-password/     # Mot de passe oublié
│       │       └── page.tsx         # Page récupération
│       │
│       ├── (dashboard)/             # Groupe Dashboard Partagé
│       │   ├── layout.tsx           # Layout avec protection conditionnelle
│       │   │
│       │   ├── admin/               # Routes System Admin
│       │   │   ├── page.tsx         # Dashboard admin principal
│       │   │   ├── organizations/   # Gestion organisations
│       │   │   │   ├── page.tsx     # Liste des organisations
│       │   │   │   ├── [id]/        # Détail organisation
│       │   │   │   ├── create/      # Création organisation
│       │   │   │   └── users/       # Gestion utilisateurs système
│       │   │   │       ├── page.tsx   # Liste des utilisateurs
│       │   │   │       ├── [id]/      # Détail utilisateur
│       │   │   │       └── create/     # Création utilisateur
│       │   │   │
│       │   │   ├── settings/        # Configuration globale
│       │   │   │   ├── page.tsx     # Paramètres système
│       │   │   │   ├── features/    # Gestion des fonctionnalités
│       │   │   │   └── billing/     # Facturation
│       │   │   └── stats/           # Statistiques globales
│       │   │       ├── page.tsx     # Dashboard statistiques
│       │   │       ├── organizations/ # Stats par organisation
│       │   │       └── users/       # Stats par utilisateur
│       │   │
│       │   └── dashboard/           # Routes Org Admin
│       │       ├── page.tsx         # Dashboard org principal
│       │       ├── stock/           # Gestion stocks
│       │       │   ├── page.tsx     # Vue d'ensemble stock
│       │       │   ├── [id]/        # Détail produit
│       │       │   ├── create/      # Ajout produit
│       │       │   └── categories/  # Gestion catégories
│       │       ├── grids/           # Gestion grilles
│       │       │   ├── page.tsx     # Vue d'ensemble grilles
│       │       │   ├── [id]/        # Détail grille
│       │       │   ├── create/      # Création grille
│       │       │   └── templates/   # Modèles de grilles
│       │       ├── alerts/          # Alertes
│       │       │   ├── page.tsx     # Liste des alertes
│       │       │   ├── [id]/        # Détail alerte
│       │       │   └── settings/    # Configuration alertes
│       │       ├── settings/        # Configuration org
│       │       │   ├── page.tsx     # Paramètres organisation
│       │       │   ├── users/       # Gestion utilisateurs org
│       │       │   ├── establishments/ # Gestion établissements
│       │       │   └── billing/     # Facturation org
│       │       └── reports/         # Rapports
│       │           ├── page.tsx     # Vue d'ensemble rapports
│       │           ├── stock/       # Rapports stock
│       │           ├── sales/       # Rapports ventes
│       │           └── analytics/   # Analyses avancées
│       │
│       ├── [slug]/                  # Routes Publiques
│       │   ├── menus/               # Menus publics
│       │   │   ├── page.tsx         # Liste des menus
│       │   │   ├── [id]/            # Détail menu
│       │   │   └── categories/      # Catégories de menus
│       │   └── booking/             # Réservations publiques
│       │       ├── page.tsx         # Formulaire réservation
│       │       ├── confirmation/    # Confirmation réservation
│       │       └── calendar/        # Calendrier disponibilités
│       │
│       └── unauthorized/            # Page d'erreur 403/401
│           └── page.tsx             # Page non autorisée
│
├── components/
│   ├── auth/                        # Composants d'authentification
│   │   ├── SystemAdminOnly.tsx      # Protection system_admin
│   │   ├── OrgAdminOnly.tsx         # Protection org_admin
│   │   ├── UserOnly.tsx             # Protection user (futur)
│   │   ├── login-form.tsx           # Formulaire de connexion
│   │   ├── register-form.tsx        # Formulaire d'inscription
│   │   └── forgot-password-form.tsx # Formulaire récupération
│   │
│   ├── admin/                       # Composants System Admin
│   │   ├── layout/
│   │   │   └── AdminAppSidebar.tsx  # Sidebar admin
│   │   ├── organizations/
│   │   │   ├── OrganizationList.tsx # Liste des organisations
│   │   │   ├── OrganizationForm.tsx # Formulaire organisation
│   │   │   ├── OrganizationCard.tsx # Carte organisation
│   │   │   ├── OrganizationStats.tsx # Statistiques organisation
│   │   │   └── OrganizationUsers.tsx # Utilisateurs organisation
│   │   ├── users/
│   │   │   ├── UserList.tsx         # Liste des utilisateurs
│   │   │   ├── UserForm.tsx         # Formulaire utilisateur
│   │   │   ├── UserCard.tsx         # Carte utilisateur
│   │   │   ├── UserRoles.tsx        # Gestion des rôles
│   │   │   └── UserPermissions.tsx  # Gestion des permissions
│   │   ├── settings/
│   │   │   ├── SystemSettings.tsx   # Paramètres système
│   │   │   ├── FeatureManager.tsx   # Gestionnaire de fonctionnalités
│   │   │   ├── BillingSettings.tsx  # Paramètres facturation
│   │   │   └── SecuritySettings.tsx # Paramètres sécurité
│   │   └── stats/
│   │       ├── GlobalStats.tsx      # Statistiques globales
│   │       ├── OrganizationStats.tsx # Stats par organisation
│   │       ├── UserStats.tsx        # Stats par utilisateur
│   │       └── AnalyticsDashboard.tsx # Dashboard analytique
│   │
│   ├── dashboard/                   # Composants Org Admin
│   │   ├── layout/
│   │   │   └── LocalizedAppSidebar.tsx # Sidebar dashboard
│   │   ├── stock/
│   │   │   ├── StockList.tsx        # Liste des stocks
│   │   │   ├── StockForm.tsx        # Formulaire stock
│   │   │   ├── StockCard.tsx        # Carte produit
│   │   │   ├── StockCategories.tsx  # Gestion catégories
│   │   │   ├── StockAlerts.tsx      # Alertes stock
│   │   │   └── StockReports.tsx     # Rapports stock
│   │   ├── grids/
│   │   │   ├── GridList.tsx         # Liste des grilles
│   │   │   ├── GridForm.tsx         # Formulaire grille
│   │   │   ├── GridCard.tsx         # Carte grille
│   │   │   ├── GridTemplates.tsx    # Modèles de grilles
│   │   │   ├── GridEditor.tsx       # Éditeur de grilles
│   │   │   └── GridAnalytics.tsx    # Analytics grilles
│   │   ├── alerts/
│   │   │   ├── AlertList.tsx        # Liste des alertes
│   │   │   ├── AlertCard.tsx        # Carte alerte
│   │   │   ├── AlertSettings.tsx    # Configuration alertes
│   │   │   ├── AlertHistory.tsx     # Historique alertes
│   │   │   └── AlertAnalytics.tsx   # Analytics alertes
│   │   ├── settings/
│   │   │   ├── OrgSettings.tsx      # Paramètres organisation
│   │   │   ├── UserManagement.tsx   # Gestion utilisateurs
│   │   │   ├── EstablishmentManager.tsx # Gestion établissements
│   │   │   ├── BillingManager.tsx   # Gestion facturation
│   │   │   └── SecurityManager.tsx  # Gestion sécurité
│   │   └── reports/
│   │       ├── ReportDashboard.tsx  # Dashboard rapports
│   │       ├── StockReports.tsx     # Rapports stock
│   │       ├── SalesReports.tsx     # Rapports ventes
│   │       ├── AnalyticsReports.tsx # Rapports analytiques
│   │       └── ExportManager.tsx    # Gestion exports
│   │
│   ├── shared/                      # Composants Partagés
│   │   ├── ui/                      # Composants UI de base (Shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── ...
│   │   ├── forms/                   # Formulaires réutilisables
│   │   │   ├── BaseForm.tsx         # Formulaire de base
│   │   │   ├── SearchForm.tsx       # Formulaire de recherche
│   │   │   ├── FilterForm.tsx       # Formulaire de filtres
│   │   │   └── ValidationForm.tsx   # Formulaire avec validation
│   │   ├── tables/                  # Tableaux réutilisables
│   │   │   ├── DataTable.tsx        # Tableau de données
│   │   │   ├── PaginatedTable.tsx   # Tableau paginé
│   │   │   ├── SortableTable.tsx    # Tableau triable
│   │   │   └── FilterableTable.tsx  # Tableau filtrable
│   │   ├── modals/                  # Modales réutilisables
│   │   │   ├── ConfirmModal.tsx     # Modal de confirmation
│   │   │   ├── FormModal.tsx        # Modal avec formulaire
│   │   │   ├── DetailModal.tsx      # Modal de détails
│   │   │   └── AlertModal.tsx       # Modal d'alerte
│   │   ├── charts/                  # Graphiques et visualisations
│   │   │   ├── LineChart.tsx        # Graphique linéaire
│   │   │   ├── BarChart.tsx         # Graphique en barres
│   │   │   ├── PieChart.tsx         # Graphique circulaire
│   │   │   └── Dashboard.tsx        # Dashboard de graphiques
│   │   └── navigation/              # Navigation
│   │       ├── Breadcrumb.tsx       # Fil d'Ariane
│   │       ├── Pagination.tsx       # Pagination
│   │       ├── Tabs.tsx             # Onglets
│   │       └── Menu.tsx             # Menu de navigation
│   │
│   └── public/                      # Composants Publics
│       ├── menus/
│       │   ├── MenuList.tsx         # Liste des menus
│       │   ├── MenuCard.tsx         # Carte menu
│       │   ├── MenuDetail.tsx       # Détail menu
│       │   ├── MenuCategories.tsx   # Catégories de menus
│       │   └── MenuSearch.tsx       # Recherche de menus
│       ├── booking/
│       │   ├── BookingForm.tsx      # Formulaire réservation
│       │   ├── BookingCalendar.tsx  # Calendrier réservation
│       │   ├── BookingConfirmation.tsx # Confirmation réservation
│       │   ├── BookingHistory.tsx   # Historique réservations
│       │   └── BookingStatus.tsx    # Statut réservation
│       └── common/
│           ├── Header.tsx           # En-tête public
│           ├── Footer.tsx           # Pied de page public
│           ├── Navigation.tsx       # Navigation publique
│           └── SearchBar.tsx        # Barre de recherche
│
├── lib/
│   ├── services/                    # Services Métier
│   │   ├── authService.ts           # Service d'authentification
│   │   ├── roleService.ts           # Service de gestion des rôles
│   │   ├── organizationService.ts   # Service des organisations
│   │   ├── stockService.ts          # Service de gestion des stocks
│   │   ├── gridService.ts           # Service des grilles
│   │   ├── alertService.ts          # Service des alertes
│   │   ├── userService.ts           # Service des utilisateurs
│   │   ├── reportService.ts         # Service des rapports
│   │   ├── notificationService.ts   # Service des notifications
│   │   └── emailService.ts          # Service d'envoi d'emails
│   │
│   ├── hooks/                       # Hooks Personnalisés
│   │   ├── useAuthRedirect.ts       # Redirection selon rôle
│   │   ├── usePermissions.ts        # Gestion des permissions
│   │   ├── useOrganization.ts       # Gestion des organisations
│   │   ├── useStock.ts              # Gestion des stocks
│   │   ├── useGrids.ts              # Gestion des grilles
│   │   ├── useAlerts.ts             # Gestion des alertes
│   │   ├── useReports.ts            # Gestion des rapports
│   │   ├── useNotifications.ts      # Gestion des notifications
│   │   └── useLocalization.ts       # Gestion de la localisation
│   │
│   ├── stores/                      # Stores LegendState
│   │   ├── authStore.ts             # Store d'authentification
│   │   ├── organizationStore.ts     # Store des organisations
│   │   ├── stockStore.ts            # Store des stocks
│   │   ├── gridStore.ts             # Store des grilles
│   │   ├── alertStore.ts            # Store des alertes
│   │   ├── reportStore.ts           # Store des rapports
│   │   ├── notificationStore.ts     # Store des notifications
│   │   └── uiStore.ts               # Store de l'interface
│   │
│   ├── utils/                       # Utilitaires
│   │   ├── permissions.ts           # Logique des permissions
│   │   ├── validation.ts            # Validation des données
│   │   ├── formatting.ts            # Formatage des données
│   │   ├── dateUtils.ts             # Utilitaires de dates
│   │   ├── currencyUtils.ts         # Utilitaires de devises
│   │   ├── fileUtils.ts             # Utilitaires de fichiers
│   │   ├── apiUtils.ts              # Utilitaires API
│   │   └── constants.ts             # Constantes de l'application
│   │
│   ├── types/                       # Types TypeScript
│   │   ├── auth.ts                  # Types d'authentification
│   │   ├── organization.ts          # Types d'organisation
│   │   ├── stock.ts                 # Types de stock
│   │   ├── grid.ts                  # Types de grilles
│   │   ├── alert.ts                 # Types d'alertes
│   │   ├── report.ts                # Types de rapports
│   │   ├── user.ts                  # Types d'utilisateur
│   │   ├── api.ts                   # Types d'API
│   │   └── common.ts                # Types communs
│   │
│   ├── supabase/                    # Configuration Supabase
│   │   ├── client.ts                # Client Supabase
│   │   ├── server.ts                # Client Supabase serveur
│   │   └── types.ts                 # Types générés Supabase
│   │
│   └── i18n/                        # Internationalisation
│       ├── locales/                 # Fichiers de traduction
│       │   ├── fr.json              # Traductions françaises
│       │   ├── en.json              # Traductions anglaises
│       │   └── es.json              # Traductions espagnoles
│       ├── config.ts                # Configuration i18n
│       └── utils.ts                 # Utilitaires i18n
│
└── api/                             # Routes API
    ├── auth/                        # API d'authentification
    │   ├── login/                   # Connexion
    │   ├── register/                # Inscription
    │   ├── logout/                  # Déconnexion
    │   ├── refresh/                 # Rafraîchissement token
    │   └── forgot-password/         # Mot de passe oublié
    ├── admin/                       # API System Admin
    │   ├── organizations/           # Gestion organisations
    │   ├── users/                   # Gestion utilisateurs
    │   ├── settings/                # Paramètres système
    │   └── stats/                   # Statistiques globales
    ├── dashboard/                   # API Org Admin
    │   ├── stock/                   # Gestion stocks
    │   ├── grids/                   # Gestion grilles
    │   ├── alerts/                  # Gestion alertes
    │   ├── settings/                # Paramètres organisation
    │   └── reports/                 # Rapports
    └── public/                      # API Publique
        ├── menus/                   # Menus publics
        ├── booking/                 # Réservations publiques
        └── search/                  # Recherche publique
```

---

## 🔐 **SYSTÈME DE PERMISSIONS DÉTAILLÉ**

### **Permissions par Rôle**

#### **System Admin**

```typescript
const systemAdminPermissions = {
  // Gestion globale
  canManageSystemUsers: true,
  canManageOrganizations: true,
  canManageGlobalFeatures: true,
  canManageDomains: true,

  // Accès aux données
  canViewAllOrganizations: true,
  canViewAllUsers: true,
  canViewGlobalStats: true,

  // Configuration
  canConfigureSystem: true,
  canManageBilling: true,
  canAccessLogs: true,
};
```

#### **Org Admin**

```typescript
const orgAdminPermissions = {
  // Gestion de l'organisation
  canManageOrgUsers: true,
  canManageOrgEstablishments: true,
  canManageOrgFeatures: true,
  canManageOrgBookings: true,

  // Accès aux données
  canViewOrgStats: true,
  canViewOrgUsers: true,
  canViewOrgEstablishments: true,

  // Configuration
  canConfigureOrg: true,
  canManageOrgBilling: true,
};
```

#### **User (Futur)**

```typescript
const userPermissions = {
  // Accès limité
  canViewAssignedEstablishments: true,
  canManageAssignedStock: false, // Selon user_features
  canViewAssignedGrids: false, // Selon user_features

  // Actions limitées
  canCreateBookings: true,
  canViewOwnBookings: true,
  canUpdateOwnProfile: true,
};
```

---

## 🔄 **FLUX D'AUTHENTIFICATION DÉTAILLÉ**

### **Processus de Connexion Complet**

```typescript
// 1. Utilisateur se connecte via Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 2. Hook useAuthRedirect intercepte la connexion
export function useAuthRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    const checkRoleAndRedirect = async () => {
      try {
        const isSystemAdmin = await roleService.isSystemAdmin(user.id);

        if (isSystemAdmin) {
          // Redirection immédiate vers /admin
          router.push('/fr/admin');
          return;
        }

        const isOrgAdmin = await roleService.isOrgAdmin(user.id);

        if (isOrgAdmin) {
          // Chargement de l'organisation puis redirection
          await loadOrganization();
          router.push('/fr/dashboard');
          return;
        }

        // Utilisateur sans rôle valide
        router.push('/fr/unauthorized');
      } catch (error) {
        console.error('Erreur lors de la vérification des rôles:', error);
        router.push('/fr/unauthorized');
      }
    };

    checkRoleAndRedirect();
  }, [user, isLoading, router]);
}

// 3. Protection des routes selon le rôle
// Routes /admin/* - Protection system_admin
<SystemAdminOnly>
  <AdminLayout>
    {children}
  </AdminLayout>
</SystemAdminOnly>

// Routes /dashboard/* - Protection org_admin
<OrgAdminOnly>
  <DashboardLayout>
    {children}
  </DashboardLayout>
</OrgAdminOnly>
```

### **Vérification des Permissions**

```typescript
// Service de vérification des permissions
export class PermissionService {
  static async checkPermission(
    userId: string,
    feature: string,
    organizationId?: string
  ): Promise<boolean> {
    const supabase = createClient();

    // Vérifier d'abord le rôle principal
    const role = await roleService.getUserRole(userId);

    // System admin a tous les droits
    if (role === 'system_admin') {
      return true;
    }

    // Vérifier les permissions granulaires
    const { data: featureData } = await supabase
      .from('user_features')
      .select('granted')
      .eq('user_id', userId)
      .eq('feature_id', feature)
      .eq('organization_id', organizationId)
      .single();

    return featureData?.granted ?? false;
  }
}
```

---

## 🎨 **COMPOSANTS UI ET UX**

### **Sidebar Conditionnelle**

```typescript
// Layout principal avec sidebar conditionnelle
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const useAdminSidebar = pathname.includes('/admin');

  if (useAdminSidebar) {
    return (
      <SystemAdminOnly>
        <SidebarProvider>
          <div className="grid w-full lg:grid-cols-[auto_1fr]">
            <AdminAppSidebar />
            <div className="flex min-h-screen w-full flex-col">
              <DashboardHeader />
              <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </SystemAdminOnly>
    );
  } else {
    return (
      <OrgAdminOnly>
        <SidebarProvider>
          <div className="grid w-full lg:grid-cols-[auto_1fr]">
            <LocalizedAppSidebar />
            <div className="flex min-h-screen w-full flex-col">
              <DashboardHeader />
              <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </OrgAdminOnly>
    );
  }
}
```

### **Navigation Adaptative**

```typescript
// Sidebar Admin
export function AdminAppSidebar() {
  const items = [
    {
      title: 'Dashboard',
      href: '/fr/admin',
      icon: HomeIcon,
    },
    {
      title: 'Organisations',
      href: '/fr/admin/organizations',
      icon: BuildingIcon,
    },
    {
      title: 'Utilisateurs',
      href: '/fr/admin/users',
      icon: UsersIcon,
    },
    {
      title: 'Paramètres',
      href: '/fr/admin/settings',
      icon: SettingsIcon,
    },
    {
      title: 'Statistiques',
      href: '/fr/admin/stats',
      icon: ChartIcon,
    },
  ];

  return <Sidebar items={items} />;
}

// Sidebar Dashboard
export function LocalizedAppSidebar() {
  const items = [
    {
      title: 'Dashboard',
      href: '/fr/dashboard',
      icon: HomeIcon,
    },
    {
      title: 'Stock',
      href: '/fr/dashboard/stock',
      icon: PackageIcon,
    },
    {
      title: 'Grilles',
      href: '/fr/dashboard/grids',
      icon: GridIcon,
    },
    {
      title: 'Alertes',
      href: '/fr/dashboard/alerts',
      icon: BellIcon,
    },
    {
      title: 'Rapports',
      href: '/fr/dashboard/reports',
      icon: FileTextIcon,
    },
    {
      title: 'Paramètres',
      href: '/fr/dashboard/settings',
      icon: SettingsIcon,
    },
  ];

  return <Sidebar items={items} />;
}
```

---

## 🚀 **ÉVOLUTION FUTURE**

### **Phase 1 - Rôles de Base (ACTUELLE)**

- ✅ System Admin
- ✅ Org Admin
- 🔄 User (en cours)

### **Phase 2 - Permissions Granulaires**

- Permissions par fonctionnalité
- Permissions par établissement
- Permissions temporelles

### **Phase 3 - Rôles Personnalisés**

- Création de rôles personnalisés
- Héritage de permissions
- Rôles par projet

### **Phase 4 - Workflows**

- Approbations multi-niveaux
- Notifications automatiques
- Audit trail complet

---

## 🔧 **OUTILS DE DÉVELOPPEMENT**

### **Scripts de Test**

```bash
# Test des permissions
npm run test:permissions

# Test des rôles
npm run test:roles

# Test de sécurité
npm run test:security
```

### **Outils de Debug**

- Page de debug des permissions (`/debug-permissions`)
- Logs détaillés des vérifications
- Simulation de rôles pour les tests

### **Documentation**

- Guide des permissions
- Exemples d'utilisation
- Bonnes pratiques

---

## 📊 **MÉTRIQUES ET MONITORING**

### **Indicateurs de Performance**

- Temps de chargement des permissions
- Nombre de requêtes par utilisateur
- Utilisation des fonctionnalités par rôle

### **Sécurité**

- Logs d'accès par rôle
- Tentatives d'accès non autorisé
- Changements de permissions

### **Utilisation**

- Fonctionnalités les plus utilisées
- Rôles les plus actifs
- Points de friction identifiés

---

## 🎯 **BONNES PRATIQUES**

### **Sécurité**

1. **Vérification côté serveur** : Toujours vérifier les permissions côté serveur
2. **Principe du moindre privilège** : Donner le minimum de permissions nécessaires
3. **Audit régulier** : Vérifier régulièrement les permissions accordées

### **Performance**

1. **Cache des permissions** : Mettre en cache les permissions fréquemment utilisées
2. **Requêtes optimisées** : Minimiser les requêtes de vérification
3. **Lazy loading** : Charger les permissions à la demande

### **Maintenabilité**

1. **Documentation claire** : Documenter chaque permission
2. **Tests automatisés** : Tester tous les cas d'usage
3. **Versioning** : Versionner les changements de permissions

---

## 📋 **CHECKLIST DE MIGRATION**

### **Base de Données**

- [ ] Créer la table `users_roles`
- [ ] Migrer les données de `users_organizations.role`
- [ ] Supprimer la colonne `role` de `users_organizations`
- [ ] Mettre à jour les fonctions SQL
- [ ] Mettre à jour les politiques RLS
- [ ] Mettre à jour les vues

### **Frontend**

- [ ] Mettre à jour les hooks de rôles
- [ ] Mettre à jour les services
- [ ] Mettre à jour les composants de protection
- [ ] Tester les redirections
- [ ] Tester les permissions

### **API**

- [ ] Mettre à jour les endpoints d'authentification
- [ ] Mettre à jour les middlewares
- [ ] Tester les autorisations
- [ ] Documenter les changements

---

**📅 Dernière mise à jour :** Session de développement  
**🎯 Statut :** Phase 1 implémentée, Phase 2 en préparation  
**🔧 Prochaines étapes :** Finalisation des composants, tests, documentation
