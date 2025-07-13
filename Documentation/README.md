# 📚 Documentation - SaaS Dashboard Restaurant

Bienvenue dans la documentation du SaaS multi-tenant pour la gestion de restaurants.

## 🚀 **NOUVELLE APPLICATION - ZUSTAND + TANSTACK QUERY**

**Cette documentation contient le contexte de l'ancienne app (LegendState) mais la nouvelle application démarrera directement avec Zustand + TanStack Query pour une meilleure performance et maintenabilité.**

### **Stack de la Nouvelle Application**
- **État** : Zustand
- **Cache** : TanStack Query + Supabase Realtime
- **Authentification** : Supabase Auth + Zustand
- **Frontend** : Next.js 15 + React 19
- **UI** : Shadcn/ui + Tailwind CSS
- **Internationalisation** : next-intl v4

---

## 🗄️ **RÉFÉRENCE BASE DE DONNÉES**

### **Types TypeScript**
**IMPORTANT** : Tous les types de base de données sont générés automatiquement par Supabase et se trouvent dans :
```
src/lib/supabase/database.types.ts
```

**Utilisation recommandée** :
```typescript
import type { Database } from '@/lib/supabase/database.types';

// Types de base depuis la DB
type DBUser = Database['public']['Tables']['users']['Row'];
type DBOrganization = Database['public']['Tables']['organizations']['Row'];
type DBBooking = Database['public']['Tables']['bookings']['Row'];
```

### **Structure des Rôles**
**IMPORTANT** : Distinction claire entre les rôles système et organisation :

#### **🏢 System Admin (`system_admin`)**
- **Niveau** : Système global
- **Accès** : Toutes les organisations et utilisateurs
- **Routes** : `/admin/*`
- **Permissions** : Gestion globale, monitoring, configuration système
- **Organisation** : Aucune organisation spécifique (accès global)

#### **👨‍💼 Org Admin (`org_admin`)**
- **Niveau** : Organisation spécifique
- **Accès** : Uniquement ses organisations
- **Routes** : `/dashboard/*`
- **Permissions** : Gestion de ses établissements, équipe, réservations
- **Organisation** : Appartient à une ou plusieurs organisations

#### **📋 Table de Référence**
| Rôle | Niveau | Accès | Routes | Permissions |
|------|--------|-------|--------|-------------|
| `system_admin` | Système | Global | `/admin/*` | Gestion globale |
| `org_admin` | Organisation | Limité | `/dashboard/*` | Gestion locale |

---

## 🎯 **DÉMARRAGE RAPIDE**

### **📋 Contexte Complet**
- **[Synthèse du Contexte](CONTEXT-SUMMARY.md)** - Contexte métier et architecture (ancienne app LegendState)
- **[Nouvelle Architecture Auth](auth/NEW-AUTHENTICATION-ARCHITECTURE.md)** - Architecture Zustand pour la nouvelle app
- **[Starter Kit Auth](auth/STARTER-KIT-ARCHITECTURE.md)** - Guide complet pour démarrer avec Zustand

### **🏗️ Architecture**
- **[Structure Complète des Pages](complete-page-structure.md)** - Architecture détaillée avec exemples
- **[Système de Rôles](ROLES-ET-STRUCTURE-COMPLET.md)** - Gestion des permissions et rôles
- **[Nouvelle Architecture Auth](auth/NEW-AUTHENTICATION-ARCHITECTURE.md)** - Migration vers Zustand + TanStack Query

## 📖 **DOCUMENTATION SPÉCIALISÉE**

### **🔐 Authentification & Sécurité**
- **[Nouvelle Architecture Auth](auth/NEW-AUTHENTICATION-ARCHITECTURE.md)** - Zustand + TanStack Query
- **[Starter Kit Auth](auth/STARTER-KIT-ARCHITECTURE.md)** - Guide complet pour démarrer avec Zustand
- **[Checklist sécurité Auth](auth/AUTH-SECURITY-CHECKLIST.md)** - Sécurité avec Supabase
- **[Plan de tests Auth](auth/AUTH-TEST-MANUAL.md)** - Tests d'authentification
- **[Améliorations Auth](auth/AUTH-IMPROVEMENTS.md)** - Patterns recommandés

### **🌐 Internationalisation**
- **[Guide i18n](i18n/I18N-GUIDE.md)** - Configuration next-intl
- **[Internationalisation](i18n/INTERNATIONALIZATION.md)** - Bonnes pratiques

### **📊 Audit & Tests**
- **[Rapport d'Audit Système](AUDIT-SYSTEM-REPORT.md)** - Audit complet (ancienne app LegendState)
- **[Récapitulatif Tables & Vues](RECAP-TABLES-VUES.md)** - Structure base de données

### **🛠️ Développement**
- **[Bonnes pratiques & Roadmap](todo/ROADMAP.md)** - Roadmap technique
- **[Guidelines Collaboration](a-garder/COLLABORATION_GUIDELINES.md)** - Règles de développement
- **[Plan de Développement](a-garder/DEVELOPMENT-PLAN.md)** - Plan d'implémentation
- **[TODO](a-garder/TODO.md)** - Tâches à effectuer

## 🎯 **POUR LA NOUVELLE APPLICATION**

### **Architecture Recommandée**
```
Frontend: Next.js 15 + React 19
État Client: Zustand
Cache & Données: TanStack Query
Authentification: Supabase Auth
Base de Données: Supabase (PostgreSQL)
Realtime: Supabase Realtime + TanStack Query
```

### **Avantages de Zustand + TanStack Query**
- ✅ **Performance** : Moins de re-renders, cache intelligent
- ✅ **Maintenabilité** : Code plus simple et prévisible
- ✅ **Debugging** : DevTools excellents
- ✅ **Écosystème** : Mature et bien documenté

### **Structure de la Nouvelle App**
```
src/
├── lib/
│   ├── stores/          # Zustand stores
│   ├── queries/         # TanStack Query hooks
│   └── supabase/        # Supabase clients
├── components/
│   ├── providers/       # React providers
│   └── auth/           # Composants auth
└── app/
    ├── [locale]/        # Routes avec i18n
    └── api/            # API routes
```

### **Documentation de Démarrage**
- **[Nouvelle Architecture](auth/NEW-AUTHENTICATION-ARCHITECTURE.md)** - Guide complet Zustand
- **[Starter Kit](auth/STARTER-KIT-ARCHITECTURE.md)** - Code prêt à l'emploi

## 📋 **ORGANISATION**

### **Documentation de Référence (Ancienne App)**
- Les guides dans la racine concernent l'ancienne app avec LegendState
- Utile pour comprendre le contexte métier et les patterns

### **Documentation Cible (Nouvelle App)**
- Les guides dans `auth/` détaillent l'architecture Zustand
- Le starter kit fournit une base complète pour démarrer

### **Ce sommaire est le point d'entrée** pour retrouver rapidement la règle ou la solution adaptée à chaque problème.

---

## ⚠️ **Limitation Windows/Powershell : Chemins avec crochets**

### Problème

Sur Windows/Powershell, les chemins contenant des crochets `[` et `]` (ex : `[locale]`) posent problème avec les commandes npm/yarn/scripts, car PowerShell interprète ces caractères comme des expressions ou des jokers.

**Exemple de commande qui ne fonctionne pas** :
```bash
npm run lint -- --file src/app/[locale]/(dashboard)/dashboard/admin/email-logs/page.tsx
```

**Erreur typique** :
```
dashboard : Le terme «dashboard» n'est pas reconnu comme nom d'applet de commande, fonction, fichier de script ou programme exécutable.
```

### Solutions recommandées
- Utiliser la commande globale sur tout le dossier :
  ```bash
  npm run lint
  ```
- Ou lancer la commande sur un terminal Bash (WSL, Git Bash) qui gère mieux les crochets.
- Ou échapper les crochets (mais ce n'est pas fiable sur PowerShell).

**Résumé** : Préfère toujours `npm run lint` pour tout le projet sous Windows/Powershell.
