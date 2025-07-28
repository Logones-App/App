# Next.js Shadcn Admin Dashboard

Un dashboard d'administration moderne et complet pour la gestion d'établissements, utilisateurs et statistiques, construit avec Next.js 15, Shadcn/ui, Supabase et internationalisation.

## 🚀 Fonctionnalités

### ✨ Interface Utilisateur
- **Design moderne** avec Shadcn/ui et Tailwind CSS
- **Thème sombre/clair** avec persistance
- **Interface responsive** pour tous les appareils
- **Animations fluides** et transitions
- **Sidebar collapsible** avec navigation intelligente

### 🔐 Authentification & Sécurité
- **Authentification Supabase** complète
- **Gestion des rôles** (System Admin, Org Admin, User)
- **Protection des routes** avec middleware
- **Sessions sécurisées** avec cookies HTTP-only
- **RLS (Row Level Security)** pour la sécurité des données

### 🌍 Internationalisation
- **Support multi-langues** (Français, Anglais, Espagnol)
- **Changement de langue** en temps réel
- **Traductions complètes** de l'interface
- **URLs localisées** (`/fr/dashboard`, `/en/dashboard`)

### 📊 Gestion des Données
- **Base de données Supabase** PostgreSQL
- **Realtime updates** avec WebSockets
- **Cache intelligent** avec TanStack Query v5
- **Optimistic updates** pour une UX fluide

### 🏢 Multi-tenant
- **Organisations multiples** avec isolation des données
- **Custom domains** pour chaque organisation
- **Gestion des utilisateurs** par organisation
- **Statistiques isolées** par tenant

## 🛠️ Technologies

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: Shadcn/ui, Tailwind CSS, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand, TanStack Query v5
- **Internationalisation**: next-intl
- **Déploiement**: Coolify (VPS)

## 📦 Installation

### Prérequis
- Node.js 18+ 
- npm ou pnpm
- Compte Supabase

### 1. Cloner le projet
```bash
git clone <repository-url>
cd next-shadcn-admin-dashboard
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration des variables d'environnement
Créer un fichier `.env.local` :
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Configuration de la base de données
Exécuter les scripts SQL dans `scripts/` pour configurer :
- Tables et relations
- RLS (Row Level Security)
- Rôles et permissions
- Données de test

### 5. Lancer en développement
```bash
npm run dev
```

## 🏗️ Architecture

### Structure des dossiers
```
src/
├── app/                    # App Router Next.js
│   ├── [locale]/          # Internationalisation
│   │   ├── (dashboard)/   # Pages protégées
│   │   ├── (main)/        # Pages publiques
│   │   └── (root)/        # Layout racine
│   └── api/               # API Routes
├── components/            # Composants réutilisables
│   ├── ui/               # Composants Shadcn/ui
│   ├── providers/        # Providers React
│   └── realtime/         # Composants temps réel
├── lib/                  # Utilitaires et services
│   ├── supabase/         # Configuration Supabase
│   ├── services/         # Services métier
│   └── stores/           # Stores Zustand
└── hooks/                # Hooks personnalisés
```

### Système d'authentification
1. **Middleware** vérifie les sessions
2. **AuthProvider** gère l'état d'authentification
3. **RLS** protège les données côté base
4. **Cookies sécurisés** pour les sessions

### Gestion des rôles
- **System Admin** : Accès complet à toutes les organisations
- **Org Admin** : Gestion de sa propre organisation
- **User** : Accès limité aux données de son organisation

## 🚀 Déploiement

### Avec Coolify (Recommandé)
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

### Variables d'environnement de production
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

## 📚 Scripts utiles

### Base de données
```bash
# Vérifier le statut RLS
npm run db:check-rls

# Configurer les rôles
npm run db:setup-roles

# Ajouter des données de test
npm run db:seed
```

### Développement
```bash
# Lancer en développement
npm run dev

# Build de production
npm run build

# Lancer en production locale
npm start

# Linting
npm run lint
```

## 🔧 Configuration

### Thème
Le thème est configuré dans `src/components/providers/theme-provider.tsx` :
- Mode sombre/clair
- Persistance dans localStorage
- Transition fluide

### Internationalisation
Les traductions sont dans `messages/` :
- `fr.json` : Français
- `en.json` : Anglais  
- `es.json` : Espagnol

### Realtime
Configuration dans `src/lib/services/realtime/` :
- Connexion automatique
- Gestion des erreurs
- Reconnexion automatique

## 🐛 Dépannage

### Erreurs courantes

#### Erreur React #418
- Vérifier la hiérarchie des layouts
- S'assurer qu'il n'y a qu'un seul `<html>` et `<body>`

#### Problèmes d'authentification
- Vérifier les variables d'environnement Supabase
- Contrôler la configuration RLS
- Vérifier les cookies de session

#### Erreurs de déploiement
- Utiliser npm au lieu de pnpm
- Vérifier les variables d'environnement
- Contrôler les permissions de fichiers

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commiter les changements (`git commit -m 'Add AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
1. Vérifier la documentation
2. Consulter les issues GitHub
3. Créer une nouvelle issue si nécessaire

---

**Développé avec ❤️ et Next.js**


