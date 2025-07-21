# 🚀 Architecture d'Implémentation - Consignes

## 📋 **INFORMATIONS GÉNÉRALES**

- **Projet** : SaaS Dashboard Restaurant
- **Objectif** : Dashboard partagé avec sidebar conditionnelle selon le rôle
- **Stack** : Next.js 15, Supabase, Zustand, TanStack Query
- **Date** : 14 Juillet 2025
- **Responsable** : Assistant IA + Utilisateur

---

## 🎯 **OBJECTIFS FINAUX**

### **✅ Critères de Succès**

- [x] **Redirection selon les rôles** ✅ **RÉALISÉ**
- [ ] Dashboard partagé pour system_admin et org_admin
- [ ] Sidebar conditionnelle selon le rôle
- [ ] Gestion de l'organisation sélectionnée pour system_admin
- [ ] Filtrage des données selon le rôle + organisation
- [ ] Navigation fluide entre les organisations
- [ ] Protection des routes appropriée

---

## 🏗️ **ARCHITECTURE DES RÔLES**

### **🏢 System Admin (`system_admin`)**

- **Accès** : Toute l'application
- **Dashboard** : Interface administrative complète
- **Fonctionnalités** :
  - Gestion des organisations (une partie de son travail)
  - Gestion des utilisateurs
  - Statistiques globales
  - Paramètres système
  - Sécurité système
- **Navigation** : Menus système (organisations, utilisateurs, paramètres globaux)
- **URLs** : `/fr/admin/*`
- **Redirection** : ✅ `/admin` après connexion

### **👨‍💼 Org Admin (`org_admin`)**

- **Accès** : Uniquement sa organisation
- **Gestion** : Établissements de sa propre organisation
- **Navigation** : Menus restaurant (établissements, menus, réservations, etc.)
- **URLs** : `/fr/dashboard/*` (même structure que system_admin)
- **Redirection** : ✅ `/dashboard` après connexion

---

## 🔧 **SOLUTIONS CHOISIES**

### **1. Redirection selon les Rôles** ✅ **RÉALISÉ**

- **Solution** : Modification du formulaire de connexion existant
- **Fichier** : `src/app/[locale]/(main)/auth/v1/login/_components/login-form.tsx`
- **Logique** :
  - Appel direct de l'API `/api/auth/roles` après connexion
  - Redirection selon le rôle récupéré
  - Gestion des erreurs et logs de debug
- **Résultat** :
  - System Admin → `/admin`
  - Org Admin → `/dashboard`
  - Aucun rôle → `/unauthorized`

### **2. Dashboard System Admin**

- **Solution** : Dashboard administratif complet
- **Page** : `/admin` → Interface avec toutes les organisations
- **Fonctionnalités** : Organisations + Utilisateurs + Stats + Paramètres
- **Navigation** : Clic sur organisation → Détails de cette organisation

### **3. Sidebar-Items selon le Rôle**

- **Solution** : Deux fichiers séparés
- **Fichiers** :
  - `src/navigation/sidebar/sidebar-items-system-admin.ts`
  - `src/navigation/sidebar/sidebar-items-org-admin.ts`
- **Logique** : Sélection conditionnelle dans AppSidebar

### **4. Protection des Routes**

- **Solution** : Middleware + Composants
- **Middleware** : Redirection des utilisateurs non connectés
- **ProtectedRoute** : Vérification des rôles et autorisations

### **5. Structure Dashboard (Approche Hybride)**

- **Layout Partagé** : `src/app/[locale]/(dashboard)/layout.tsx`
- **Structure** : Header partagé + Sidebar conditionnelle + Content
- **Logique** :
  - Composants partagés (Header, thème, recherche)
  - Sidebar conditionnelle selon le rôle
  - Routes séparées (/admin/_ vs /dashboard/_)
- **Migration** : Fichiers actuels dans `(main)/(dashboard)/` restent intacts

---

## 📂 **STRUCTURE DES DOSSIERS**

### **Structure Actuelle**

```
src/app/[locale]/(main)/
├── (dashboard)/                   # GROUPE AVEC LAYOUT PARTAGÉ
│   ├── layout.tsx                 # Layout avec sidebar + header
│   ├── page.tsx                   # Dashboard principal (partagé)
│   ├── admin/                     # System Admin Routes
│   │   └── users/                 # Gestion utilisateurs système
│   ├── establishments/            # Org Admin Routes
│   ├── default/                   # Dashboard par défaut
│   ├── about/                     # Page à propos
│   └── _components/               # Composants sidebar
└── auth/                          # Authentification
└── unauthorized/                  # Page non autorisée
```

### **Structure Proposée (Approche Hybride)**

```
src/app/[locale]/
├── (dashboard)/                   # GROUPE AVEC LAYOUT PARTAGÉ
│   ├── layout.tsx                 # LAYOUT PARTAGÉ
│   │                              # Header + Sidebar conditionnelle
│   │                              # + Composants communs
│   ├── admin/                     # 🏢 System Admin
│   │   ├── page.tsx               # Dashboard admin
│   │   ├── organizations/         # Gestion organisations
│   │   ├── users/                 # Gestion utilisateurs
│   │   └── establishments/        # Vue système
│   └── dashboard/                 # Org Admin
│       ├── page.tsx               # Dashboard org
│       ├── establishments/        # Ses établissements
│       ├── menus/                 # Ses menus
│       └── bookings/              # Ses réservations
├── (main)/                        # ANCIENNE STRUCTURE (à migrer)
│   ├── (dashboard)/               # Fichiers actuels (intacts)
│   ├── auth/                      # Authentification
│   └── unauthorized/              # Page non autorisée
└── auth/                         # Authentification (nouvelle)
```

---

## 🔄 **FLUX DE DONNÉES**

### **System Admin**

1. **Connexion** → `/admin` → Dashboard administratif complet ✅ **FONCTIONNE**
2. **Dashboard** → Interface avec toutes les organisations + autres fonctionnalités
3. **Sélection Orga** → Clic sur une organisation → Détails de cette organisation
4. **Navigation** → Menus système (organisations, utilisateurs, stats, paramètres)

### **Org Admin**

1. **Connexion** → Récupération de son organisation
2. **Navigation** → Affichage direct des établissements de son organisation
3. **Sidebar** → Menus restaurant (établissements, menus, réservations, etc.)

---

## 📁 **FICHIERS À CRÉER/MODIFIER**

### **Nouveaux Fichiers (Architecture)**

- [x] `src/lib/stores/workspace-store.ts` ✅ **CRÉÉ**
- [x] `src/navigation/sidebar/sidebar-items-system-admin.ts` ✅ **CRÉÉ**
- [x] `src/navigation/sidebar/sidebar-items-org-admin.ts` ✅ **CRÉÉ**

### **Nouveaux Fichiers à Créer**

- [x] `src/app/[locale]/(dashboard)/layout.tsx` (layout partagé) ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/admin/page.tsx` (dashboard administratif complet) ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/admin/organizations/page.tsx` (liste organisations) ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/admin/organizations/[id]/page.tsx` (détails organisation)
- [x] `src/app/[locale]/(dashboard)/admin/users/page.tsx` (gestion utilisateurs) ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/admin/statistics/page.tsx` (stats globales)
- [x] `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (paramètres système)
- [x] `src/app/[locale]/(dashboard)/dashboard/page.tsx` (dashboard org) ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/dashboard/establishments/page.tsx` ✅ **CRÉÉ**
- [x] `src/app/[locale]/(dashboard)/dashboard/menus/page.tsx`
- [x] `src/app/[locale]/(dashboard)/dashboard/bookings/page.tsx`

### **Fichiers Modifiés**

- [x] `src/app/[locale]/(main)/auth/v1/login/_components/login-form.tsx` ✅ **MODIFIÉ** - Redirection selon les rôles

### **Fichiers Actuels (Intacts - Migration Progressive)**

- [ ] `src/app/[locale]/(main)/(dashboard)/_components/sidebar/app-sidebar.tsx` (à migrer)
- [ ] `src/app/[locale]/(main)/(dashboard)/layout.tsx` (à migrer)
- [ ] `src/app/[locale]/(main)/(dashboard)/page.tsx` (à migrer)

---

## 🎯 **QUESTIONS À RÉSOUDRE**

### **1. Sélection d'Organisation**

- ✅ **Où** : Page `/admin/organizations` avec tableau des organisations
- ✅ **Comportement** : Clic sur une organisation → Détails de cette organisation
- ✅ **Persistance** : Pas de persistance (realtime plus tard)

### **2. Navigation**

- ✅ **Navigation** : System admin revient à `/admin/organizations` pour changer d'organisation
- ✅ **Page de sélection** : `/admin/organizations` avec tableau des organisations
- ✅ **URL** : `/admin/organizations/[id]` pour les détails d'une organisation

### **3. Filtrage des Données**

- ✅ **Logique** : Hooks personnalisés par type de données avec filtrage côté serveur
- ✅ **Gestion** : Requêtes conditionnelles selon le rôle (system_admin vs org_admin)
- ✅ **Cache** : Cache par organisation avec invalidation sélective
- ✅ **Performance** : Lazy loading + pagination pour les grandes listes

---

## ✅ **RÉALISATIONS RÉCENTES**

### **14 Juillet 2025 - Redirection selon les Rôles** ✅ **TERMINÉ**

**Problème résolu :**

- Les utilisateurs étaient tous redirigés vers `/dashboard` au lieu de respecter leurs rôles
- Le formulaire de connexion ne vérifiait pas les rôles

**Solution implémentée :**

- Modification du formulaire de connexion existant
- Appel direct de l'API `/api/auth/roles` après connexion
- Redirection conditionnelle selon le rôle récupéré
- Gestion des erreurs et logs de debug

**Résultat :**

- ✅ System Admin → `/admin`
- ✅ Org Admin → `/dashboard`
- ✅ Aucun rôle → `/unauthorized`

**Fichiers modifiés :**

- `src/app/[locale]/(main)/auth/v1/login/_components/login-form.tsx`

---

## 🚀 **PROCHAINES ÉTAPES**

1. **Tester la navigation** entre les pages créées
2. **Implémenter la sidebar conditionnelle** selon les rôles
3. **Migrer les composants existants** vers la nouvelle architecture
4. **Implémenter le filtrage des données** selon les rôles
5. **Ajouter les fonctionnalités manquantes** (menus, réservations, etc.)

## Convention multi-tenant : gestion de l’ID d’organisation

- **L’ID d’organisation est la source de vérité pour charger les données métiers.**
- **Pour system_admin** : l’ID d’organisation est toujours présent dans l’URL (`/admin/organizations/[organizationId]/...`).
- **Pour org_admin** : l’ID d’organisation est déduit du profil utilisateur (métadonnées), jamais dans l’URL.
- **Les composants/pages métiers sont partagés** entre system_admin et org_admin : ils reçoivent toujours un `organizationId` (depuis l’URL ou le profil user).
- **Aucune dépendance à un state global d’orga** côté system_admin : tout passe par l’URL.
- **Navigation** : le changement d’organisation se fait en changeant l’ID dans l’URL (ex : bouton « Gérer » dans la liste des organisations).
- **Permissions** : sont calculées dynamiquement selon le rôle et l’ID d’orga fourni.

> Cette convention garantit la cohérence, la sécurité et la simplicité du code multi-tenant.

## Pages partagées multi-tenant & récupération de l’organizationId

### 1. Structure partagée des pages métiers

- **Toutes les pages métiers (établissements, menus, utilisateurs, etc.) doivent être factorisées dans un composant partagé** (ex : `EstablishmentsShared`).
- Ce composant reçoit toujours un `organizationId` en prop.
- Deux points d’entrée :
  - **Pour system_admin** : l’ID d’organisation est extrait de l’URL (`/admin/organizations/[organizationId]/...`).
  - **Pour org_admin** : l’ID d’organisation est récupéré dynamiquement côté client (voir ci-dessous).
- Les pages Next.js restent des composants serveur, et délèguent la logique client à un composant client intermédiaire si besoin.

### 2. Récupération de l’ID d’organisation

- **Pour system_admin** : dans chaque page, extraire l’ID d’orga de l’URL avec `useParams` :
  ```tsx
  import { useParams } from "next/navigation";
  const params = useParams();
  const organizationId = params.id as string;
  ```
- **Pour org_admin** : utiliser le hook `useOrgaUserOrganizationId` qui va chercher l’ID d’orga unique de l’utilisateur connecté dans la table `users_organizations` :
  ```tsx
  import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
  const organizationId = useOrgaUserOrganizationId();
  ```
- **Pattern recommandé** : si la page a besoin de hooks React côté client, créer un composant client intermédiaire (ex : `EstablishmentsClient`) et l’utiliser dans la page serveur.

### 3. Exemple de page partagée

```tsx
// page.tsx (serveur)
import { EstablishmentsClient } from "./establishments-client";
export default function EstablishmentsPage() {
  return <EstablishmentsClient />;
}

// establishments-client.tsx (client)
("use client");
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishments-shared";
export function EstablishmentsClient() {
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentsShared organizationId={organizationId || ""} />;
}

// _components/establishments/establishments-shared.tsx (client)
("use client");
import { useOrganizationEstablishments } from "@/lib/queries/establishments";
export function EstablishmentsShared({ organizationId }: { organizationId: string }) {
  const { data: establishments = [] } = useOrganizationEstablishments(organizationId);
  // ... rendu de la liste ...
}
```

### 4. Avantages

- Factorisation maximale du code métier
- Navigation et permissions cohérentes
- Facile à étendre à d’autres entités (menus, utilisateurs, etc.)
- Compatible avec les bonnes pratiques Next.js (app router, client/server)

## Page d’établissement unique partagée (détail)

### 1. Composant partagé

- Créer un composant `EstablishmentDetailsShared` qui reçoit `establishmentId` et `organizationId` en props.
- Ce composant affiche les détails de l’établissement (nom, adresse, description, etc.).

### 2. Entrée org_admin (dashboard)

- Dossier : `/dashboard/establishments/[id]/`
- Page serveur : `page.tsx`
- Composant client intermédiaire : `establishment-client.tsx` (utilise le hook `useOrgaUserOrganizationId`)
- Exemple :

```tsx
// page.tsx (serveur)
import { EstablishmentClient } from "./establishment-client";
export default function EstablishmentPage() {
  return <EstablishmentClient />;
}

// establishment-client.tsx (client)
("use client");
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentDetailsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-details-shared";
export function EstablishmentClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentDetailsShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
```

### 3. Entrée system_admin (multi-tenant)

- Dossier : `/admin/organizations/[id]/establishments/[establishmentId]/`
- Page serveur : `page.tsx`
- Composant client intermédiaire : `establishment-client.tsx` (utilise l’ID d’orga de l’URL)
- Exemple :

```tsx
// page.tsx (serveur)
import { EstablishmentClient } from "./establishment-client";
export default function EstablishmentPage() {
  return <EstablishmentClient />;
}

// establishment-client.tsx (client)
("use client");
import { useParams } from "next/navigation";
import { EstablishmentDetailsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-details-shared";
export function EstablishmentClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <EstablishmentDetailsShared establishmentId={establishmentId} organizationId={organizationId} />;
}
```

### 4. Navigation depuis la liste

- Dans le composant de liste (`EstablishmentsShared`), ajouter un lien « Voir » qui pointe vers la page de détail :
  - Pour org_admin : `/dashboard/establishments/[id]`
  - Pour system_admin : `/admin/organizations/[organizationId]/establishments/[establishmentId]`
- Utiliser le composant `Link` de Next.js pour la navigation.

### 5. Avantages

- Factorisation maximale (un seul composant métier pour le détail)
- Navigation cohérente et DRY
- Facile à étendre à d’autres entités (menus, utilisateurs, etc.)
