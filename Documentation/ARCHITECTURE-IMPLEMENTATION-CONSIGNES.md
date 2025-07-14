# 🚀 Architecture d'Implémentation - Consignes

## 📋 **INFORMATIONS GÉNÉRALES**

- **Projet** : SaaS Dashboard Restaurant
- **Objectif** : Dashboard partagé avec sidebar conditionnelle selon le rôle
- **Stack** : Next.js 15, Supabase, Zustand, TanStack Query
- **Date** : [À compléter]
- **Responsable** : Assistant IA + Utilisateur

---

## 🎯 **OBJECTIFS FINAUX**

### **✅ Critères de Succès**

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

### **👨‍💼 Org Admin (`org_admin`)**

- **Accès** : Uniquement sa organisation
- **Gestion** : Établissements de sa propre organisation
- **Navigation** : Menus restaurant (établissements, menus, réservations, etc.)
- **URLs** : `/fr/dashboard/*` (même structure que system_admin)

---

## 🔧 **SOLUTIONS CHOISIES**

### **1. Dashboard System Admin**

- **Solution** : Dashboard administratif complet
- **Page** : `/admin` → Interface avec toutes les organisations
- **Fonctionnalités** : Organisations + Utilisateurs + Stats + Paramètres
- **Navigation** : Clic sur organisation → Détails de cette organisation

### **2. Sidebar-Items selon le Rôle**

- **Solution** : Deux fichiers séparés
- **Fichiers** :
  - `src/navigation/sidebar/sidebar-items-system-admin.ts`
  - `src/navigation/sidebar/sidebar-items-org-admin.ts`
- **Logique** : Sélection conditionnelle dans AppSidebar

### **3. Protection des Routes**

- **Solution** : Middleware + Composants
- **Middleware** : Redirection des utilisateurs non connectés
- **ProtectedRoute** : Vérification des rôles et autorisations

### **4. Structure Dashboard (Approche Hybride)**

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

1. **Connexion** → `/admin` → Dashboard administratif complet
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

- [ ] `src/lib/stores/workspace-store.ts`
- [ ] `src/navigation/sidebar/sidebar-items-system-admin.ts`
- [ ] `src/navigation/sidebar/sidebar-items-org-admin.ts`

### **Nouveaux Fichiers à Créer**

- [ ] `src/app/[locale]/(dashboard)/layout.tsx` (layout partagé)
- [ ] `src/app/[locale]/(dashboard)/admin/page.tsx` (dashboard administratif complet)
- [ ] `src/app/[locale]/(dashboard)/admin/organizations/page.tsx` (liste organisations)
- [ ] `src/app/[locale]/(dashboard)/admin/organizations/[id]/page.tsx` (détails organisation)
- [ ] `src/app/[locale]/(dashboard)/admin/users/page.tsx` (gestion utilisateurs)
- [ ] `src/app/[locale]/(dashboard)/admin/statistics/page.tsx` (stats globales)
- [ ] `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (paramètres système)
- [ ] `src/app/[locale]/(dashboard)/dashboard/page.tsx` (dashboard org)
- [ ] `src/app/[locale]/(dashboard)/dashboard/establishments/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/dashboard/menus/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/dashboard/bookings/page.tsx`

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

## ✅ **VALIDATION**

- ✅ Architecture validée
- ✅ Structure des dossiers validée
- ✅ Solutions techniques validées
- ✅ Questions résolues
- ✅ Prêt pour l'implémentation

---

## 📝 **NOTES**

_Document à étoffer jusqu'à validation complète avant implémentation._
