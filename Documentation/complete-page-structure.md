# 🏗️ Architecture & Structure - SaaS Dashboard Restaurant

## 📋 Table des Matières

1. [🎯 Vue d'Ensemble](#-vue-densemble)
2. [👥 Types d'Utilisateurs](#-types-dutilisateurs)
3. [🏗️ Architecture des URLs](#️-architecture-des-urls)
4. [📂 Structure des Dossiers](#-structure-des-dossiers)
5. [🔐 Système de Permissions](#-système-de-permissions)
6. [🎨 Interface Utilisateur](#-interface-utilisateur)
7. [🚀 Performance & SEO](#-performance--seo)

---

## 🎯 Vue d'Ensemble

### **🏪 Concept Principal**

Application SaaS multi-tenant pour la gestion de restaurants avec **3 niveaux d'utilisateurs** distincts :

- **👥 Visiteurs** : Consultation publique des restaurants
- **👨‍💼 Admins Organisation** : Gestion de leurs établissements
- **🏢 Admins Système** : Administration globale de la plateforme

### **🔗 Modèle de Données**

```
Organisation (Company)
├── Établissements (Restaurants)
│   ├── Menus & Produits
│   ├── Réservations
│   ├── Clients
│   └── Paramètres
└── Utilisateurs (Team)
    ├── Admins Organisation
    ├── Staff
    └── Permissions
```

---

## 👥 Types d'Utilisateurs

### **1. 👥 Visiteurs (Public)**

**Rôle** : Consultation publique des restaurants

**Fonctionnalités** :

- ✅ Consultation des menus en ligne
- ✅ Réservation de tables
- ✅ Informations sur les restaurants
- ❌ Pas d'accès aux dashboards

**URLs** : `/fr/[establishment-slug]/*`

---

### **2. 👨‍💼 Admins Organisation (`org_admin`)**

**Rôle** : Gestion de leurs établissements

**Fonctionnalités** :

- ✅ Gestion des menus et produits
- ✅ Gestion des réservations
- ✅ Gestion de l'équipe
- ✅ Analytics de leurs établissements
- ❌ Pas d'accès aux autres organisations

**URLs** : `/fr/dashboard/*`

---

### **3. 🏢 Admins Système (`system_admin`)**

**Rôle** : Administration globale de la plateforme

**Fonctionnalités** :

- ✅ Gestion de toutes les organisations
- ✅ Gestion de tous les utilisateurs
- ✅ Analytics globales
- ✅ Paramètres système
- ✅ Logs et monitoring

**URLs** : `/fr/admin/*`

---

## 🏗️ Architecture des URLs

### **🎯 Principe de Design**

**URLs simplifiées pour l'expérience utilisateur** avec redirection automatique en arrière-plan.

### **📊 Comparaison des URLs**

| Type d'Utilisateur  | URL Visible               | URL Technique                                     | Comportement            |
| ------------------- | ------------------------- | ------------------------------------------------- | ----------------------- |
| **👥 Visiteur**     | `/fr/la-plank-des-gones`  | `/fr/la-plank-des-gones`                          | Accès direct            |
| **👨‍💼 Org Admin**    | `/fr/dashboard/menus`     | `/fr/dashboard/[org]/establishments/[slug]/menus` | Redirection automatique |
| **🏢 System Admin** | `/fr/admin/organizations` | `/fr/admin/organizations`                         | Accès direct            |

### **🔄 Logique de Redirection**

#### **Pour les Org Admins**

```typescript
// Exemple : /fr/dashboard/menus
// 1. Récupérer l'organisation de l'utilisateur
// 2. Pré-sélectionner le premier établissement
// 3. Rediriger vers : /fr/dashboard/[org]/establishments/[first]/menus
```

#### **Pour les Visiteurs**

```typescript
// Exemple : /fr/la-plank-des-gones
// 1. Chercher l'établissement par slug
// 2. Si plusieurs établissements → page de sélection
// 3. Si un seul → affichage direct
```

---

## 📂 Structure des Dossiers

### **🏗️ Architecture Générale**

```
src/app/[locale]/
├── page.tsx                    # 🏠 Page d'accueil
├── auth/                       # 🔐 Authentification
├── [establishment-slug]/       # 👥 Visiteurs (Public)
├── (dashboard)/               # 🏢 + 👨‍💼 Layout partagé
│   ├── admin/                 # 🏢 System Admin
│   └── dashboard/             # 👨‍💼 Org Admin
└── api/                       # 🔌 API Routes
```

### **📁 Détail par Section**

#### **🔐 Authentification (`/auth/`)**

```
auth/
├── login/
│   └── page.tsx              # Connexion
├── register/
│   └── page.tsx              # Inscription
└── forgot-password/
    └── page.tsx              # Mot de passe oublié
```

#### **👥 Visiteurs (`/[establishment-slug]/`)**

```
[establishment-slug]/
├── page.tsx                  # Page d'accueil restaurant
├── menu/
│   └── page.tsx              # Carte en ligne
├── reservations/
│   ├── page.tsx              # Réservations publiques
│   └── [id]/
│       └── page.tsx          # Détail réservation
├── contact/
│   └── page.tsx              # Contact
├── about/
│   └── page.tsx              # À propos
├── legal/
│   ├── privacy/
│   │   └── page.tsx          # Politique de confidentialité
│   └── terms/
│       └── page.tsx          # Conditions d'utilisation
└── establishments/           # Si plusieurs établissements
    └── page.tsx              # Liste des établissements
```

#### **🏢 System Admin (`/admin/`)**

```
admin/
├── page.tsx                  # Dashboard principal
├── overview/
│   └── page.tsx              # Vue d'ensemble globale
├── organizations/
│   ├── page.tsx              # Liste des organisations
│   ├── [id]/
│   │   ├── page.tsx          # Détail organisation
│   │   ├── edit/
│   │   │   └── page.tsx      # Modifier organisation
│   │   ├── establishments/   # Établissements de cette orga
│   │   │   ├── page.tsx      # Liste des établissements
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail établissement
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx # Modifier établissement
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx # Paramètres établissement
│   │   │   └── new/
│   │   │       └── page.tsx  # Nouvel établissement
│   │   └── settings/
│   │       └── page.tsx      # Paramètres organisation
│   └── new/
│       └── page.tsx          # Nouvelle organisation
├── establishments/
│   ├── page.tsx              # Liste globale des établissements
│   ├── [id]/
│   │   ├── page.tsx          # Détail établissement
│   │   ├── edit/
│   │   │   └── page.tsx      # Modifier établissement
│   │   └── settings/
│   │       └── page.tsx      # Paramètres établissement
│   └── new/
│       └── page.tsx          # Nouvel établissement
├── users/
│   ├── page.tsx              # Liste des utilisateurs
│   ├── [id]/
│   │   ├── page.tsx          # Détail utilisateur
│   │   ├── edit/
│   │   │   └── page.tsx      # Modifier utilisateur
│   │   └── permissions/
│   │       └── page.tsx      # Gestion des permissions
│   └── new/
│       └── page.tsx          # Nouvel utilisateur
├── analytics/
│   ├── page.tsx              # Analytics globales
│   ├── organizations/
│   │   └── page.tsx          # Stats par organisation
│   └── establishments/
│       └── page.tsx          # Stats par établissement
├── billing/
│   ├── page.tsx              # Facturation globale
│   ├── invoices/
│   │   └── page.tsx          # Factures
│   └── subscriptions/
│       └── page.tsx          # Abonnements
├── settings/
│   ├── page.tsx              # Paramètres globaux
│   ├── general/
│   │   └── page.tsx          # Configuration générale
│   ├── security/
│   │   └── page.tsx          # Sécurité
│   ├── integrations/
│   │   └── page.tsx          # Intégrations
│   └── backup/
│       └── page.tsx          # Sauvegarde
└── logs/
    └── page.tsx              # Logs système
```

#### **👨‍💼 Org Admin (`/dashboard/`)**

```
dashboard/
├── page.tsx                  # Dashboard principal (redirection)
├── overview/
│   └── page.tsx              # Vue d'ensemble (redirection)
├── establishments/           # Gestion des établissements
│   ├── page.tsx              # Liste des établissements
│   ├── [slug]/
│   │   ├── page.tsx          # Gestion établissement
│   │   ├── edit/
│   │   │   └── page.tsx      # Modifier établissement
│   │   ├── menus/
│   │   │   ├── page.tsx      # Gestion des cartes
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail carte
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx # Modifier carte
│   │   │   │   └── products/
│   │   │   │       └── page.tsx # Produits de la carte
│   │   │   └── new/
│   │   │       └── page.tsx  # Nouvelle carte
│   │   ├── products/
│   │   │   ├── page.tsx      # Gestion des produits
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail produit
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx # Modifier produit
│   │   │   │   └── images/
│   │   │   │       └── page.tsx # Images du produit
│   │   │   └── new/
│   │   │       └── page.tsx  # Nouveau produit
│   │   ├── categories/
│   │   │   ├── page.tsx      # Gestion des catégories
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail catégorie
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx # Modifier catégorie
│   │   │   └── new/
│   │   │       └── page.tsx  # Nouvelle catégorie
│   │   ├── reservations/
│   │   │   ├── page.tsx      # Gestion des réservations
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail réservation
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx # Modifier réservation
│   │   │   │   └── status/
│   │   │   │       └── page.tsx # Changer statut
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx  # Calendrier des réservations
│   │   │   └── settings/
│   │   │       └── page.tsx  # Paramètres réservations
│   │   ├── customers/
│   │   │   ├── page.tsx      # Gestion des clients
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx  # Détail client
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx # Modifier client
│   │   │   │   └── history/
│   │   │   │       └── page.tsx # Historique client
│   │   │   └── new/
│   │   │       └── page.tsx  # Nouveau client
│   │   ├── analytics/
│   │   │   ├── page.tsx      # Analytics établissement
│   │   │   ├── sales/
│   │   │   │   └── page.tsx  # Ventes
│   │   │   ├── reservations/
│   │   │   │   └── page.tsx  # Statistiques réservations
│   │   │   └── customers/
│   │   │       └── page.tsx  # Statistiques clients
│   │   └── settings/
│   │       ├── page.tsx      # Paramètres établissement
│   │       ├── general/
│   │       │   └── page.tsx  # Informations générales
│   │       ├── appearance/
│   │       │   └── page.tsx  # Apparence (logo, couleurs)
│   │       ├── contact/
│   │       │   └── page.tsx  # Informations de contact
│   │       ├── hours/
│   │       │   └── page.tsx  # Horaires d'ouverture
│   │       ├── locations/
│   │       │   └── page.tsx  # Adresses
│   │       ├── integrations/
│   │       │   └── page.tsx  # Intégrations (Google, etc.)
│   │       ├── notifications/
│   │       │   └── page.tsx  # Notifications
│   │       └── security/
│   │           └── page.tsx  # Sécurité
│   └── new/
│       └── page.tsx          # Nouvel établissement
├── team/                     # Gestion de l'équipe
│   ├── page.tsx              # Liste des membres
│   ├── [id]/
│   │   ├── page.tsx          # Détail membre
│   │   ├── edit/
│   │   │   └── page.tsx      # Modifier membre
│   │   └── permissions/
│   │       └── page.tsx      # Gestion des permissions
│   └── new/
│       └── page.tsx          # Nouveau membre
├── analytics/
│   ├── page.tsx              # Analytics organisation
│   ├── sales/
│   │   └── page.tsx          # Ventes
│   ├── reservations/
│   │   └── page.tsx          # Statistiques réservations
│   └── customers/
│       └── page.tsx          # Statistiques clients
├── billing/
│   ├── page.tsx              # Facturation
│   ├── invoices/
│   │   └── page.tsx          # Factures
│   ├── subscription/
│   │   └── page.tsx          # Abonnement
│   └── payment-methods/
│       └── page.tsx          # Moyens de paiement
├── settings/
│   ├── page.tsx              # Paramètres organisation
│   ├── general/
│   │   └── page.tsx          # Informations générales
│   ├── appearance/
│   │   └── page.tsx          # Apparence
│   ├── contact/
│   │   └── page.tsx          # Informations de contact
│   ├── integrations/
│   │   └── page.tsx          # Intégrations
│   ├── notifications/
│   │   └── page.tsx          # Notifications
│   └── security/
│       └── page.tsx          # Sécurité
└── help/
    └── page.tsx              # Aide et support
```

#### **🔌 API Routes (`/api/`)**

```
api/
├── auth/
│   ├── login/
│   │   └── route.ts
│   ├── register/
│   │   └── route.ts
│   └── logout/
│       └── route.ts
├── admin/
│   ├── organizations/
│   │   └── route.ts
│   ├── establishments/
│   │   └── route.ts
│   └── users/
│       └── route.ts
├── establishments/
│   ├── [establishment-slug]/
│   │   ├── menus/
│   │   │   └── route.ts
│   │   ├── products/
│   │   │   └── route.ts
│   │   └── reservations/
│   │       └── route.ts
│   └── route.ts
└── webhooks/
    └── stripe/
        └── route.ts
```

---

## 🔐 Système de Permissions

### **🛡️ Middleware de Protection**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques
  if (
    pathname.startsWith('/fr/') &&
    !pathname.includes('/admin/') &&
    !pathname.includes('/dashboard/')
  ) {
    return NextResponse.next();
  }

  // Routes admin système
  if (pathname.startsWith('/fr/admin/')) {
    return checkSystemAdminRole(request);
  }

  // Routes admin organisation
  if (pathname.startsWith('/fr/dashboard/')) {
    return checkOrgAdminRole(request);
  }

  return NextResponse.next();
}
```

### **🔍 Vérifications par Type d'Utilisateur**

| Type                | Accès                        | Authentification | Rôle Requis    | Permissions                  |
| ------------------- | ---------------------------- | ---------------- | -------------- | ---------------------------- |
| **👥 Visiteur**     | `/fr/[establishment-slug]/*` | ❌ Aucune        | -              | Lecture seule                |
| **👨‍💼 Org Admin**    | `/fr/dashboard/*`            | ✅ Requise       | `org_admin`    | Limitées à leur organisation |
| **🏢 System Admin** | `/fr/admin/*`                | ✅ Requise       | `system_admin` | Gestion globale              |

### **🎯 Logique de Sécurité**

#### **Pour les Org Admins**

- ✅ Accès uniquement à leur organisation
- ✅ Gestion de leurs établissements
- ❌ Pas d'accès aux autres organisations
- ❌ Pas d'accès aux paramètres système

#### **Pour les System Admins**

- ✅ Accès complet à toutes les organisations
- ✅ Gestion de tous les utilisateurs
- ✅ Paramètres système globaux
- ✅ Analytics et logs

---

## 🎨 Interface Utilisateur

### **📱 Responsive Design**

#### **Mobile First**

- ✅ Toutes les pages optimisées mobile
- ✅ Navigation adaptative
- ✅ Formulaires touch-friendly

#### **Tablette**

- ✅ Layout adapté
- ✅ Sidebar collapsible

#### **Desktop**

- ✅ Interface complète
- ✅ Sidebar fixe
- ✅ Tableaux de bord détaillés

### **🎨 Design par Type de Page**

#### **Pages Publiques**

- 🎨 Design restaurant (couleurs, logo personnalisé)
- 🧭 Navigation simple
- 📱 Optimisé mobile
- ❌ Pas de sidebar

#### **Dashboard System Admin**

- 🏢 Interface administrative complète
- 📋 Sidebar avec toutes les fonctionnalités
- 📊 Tableaux de bord globaux
- 👥 Gestion des utilisateurs et organisations

#### **Dashboard Org Admin**

- 🍽️ Interface de gestion restaurant
- 📋 Sidebar avec fonctionnalités restaurant
- 📊 Tableaux de bord organisationnels
- 🍴 Gestion des menus, produits, réservations

---

## 🚀 Performance & SEO

### **⚡ Optimisations Performance**

- 🚀 Lazy loading des composants
- 🖼️ Images optimisées
- 📦 Code splitting par route
- 💾 Cache des données

### **🔍 SEO**

- 🏷️ Meta tags dynamiques
- 📱 Open Graph
- 🏪 Schema.org pour restaurants
- 🗺️ Sitemap automatique

---

## 📚 Exemples Concrets

### **🏪 Exemple d'Organisation**

```
Organisation: "La Plank des Gones"
├── Établissement: "Restaurant Lyon Centre"
│   ├── URL Visiteur: /fr/la-plank-des-gones
│   ├── URL Admin Orga: /fr/dashboard/menus
│   ├── Menus: Carte du Midi, Carte du Soir
│   └── Réservations: Réservations du restaurant
└── Établissement: "Restaurant Lyon Part-Dieu"
    ├── URL Visiteur: /fr/lyon-part-dieu
    ├── URL Admin Orga: /fr/dashboard/establishments/lyon-part-dieu/menus
    ├── Menus: Carte Business, Carte Dégustation
    └── Réservations: Réservations du restaurant
```

### **🔄 Flux de Navigation**

#### **Org Admin se connecte**

1. ✅ Authentification réussie
2. 🔍 Récupération de l'organisation
3. 🏪 Pré-sélection du premier établissement
4. 📊 Redirection vers `/fr/dashboard/overview`

#### **Visiteur consulte un restaurant**

1. 🔍 Recherche de l'établissement par slug
2. 🏪 Affichage des informations
3. 📱 Interface mobile optimisée
4. 🍽️ Accès aux menus et réservations

---

## 🎯 Résumé

Cette architecture offre :

- ✅ **Séparation claire** des rôles et responsabilités
- ✅ **URLs simplifiées** pour une meilleure UX
- ✅ **Sécurité renforcée** avec middleware
- ✅ **Scalabilité** pour de multiples organisations
- ✅ **Performance optimisée** avec Next.js 15
- ✅ **SEO-friendly** pour les restaurants

L'application est conçue pour être **intuitive**, **sécurisée** et **performante** pour tous les types d'utilisateurs ! 🚀

---

## ⚠️ **MIGRATIONS EN ATTENTE**

### **1. Migration du Dossier Admin**

**Problème** : Le dossier `(dashboard)/dashboard/admin/` contient des pages d'administration système qui devraient être dans `(dashboard)/admin/`

**Migration nécessaire** :

- Déplacer `(dashboard)/dashboard/admin/*` vers `(dashboard)/admin/*`
- Fusionner les dossiers en conflit (ex: `organizations/`)
- Supprimer le dossier `(dashboard)/dashboard/admin/` vide
- Mettre à jour les liens dans la sidebar

**Impact** :

- URLs changent de `/fr/dashboard/admin/*` vers `/fr/admin/*`
- Cohérence avec l'architecture définie
- Éviter les doublons et confusions
