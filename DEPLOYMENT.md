# Guide de Déploiement

## 🚀 Déploiement avec Coolify

### Configuration recommandée

#### Variables d'environnement Coolify

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com
```

#### Configuration du build

- **Build Command** : `npm ci && npm run build`
- **Start Command** : `npm start`
- **Node Version** : 22

### Problèmes résolus

#### ❌ Erreur pnpm

**Problème** : Coolify utilise pnpm par défaut mais le projet est configuré pour npm.

**Solution** :

1. Supprimer `pnpm-lock.yaml` s'il existe
2. Utiliser `npm ci` dans la commande de build
3. S'assurer que `package-lock.json` est présent

#### ❌ Erreur React #418

**Problème** : Conflit de hiérarchie des layouts avec plusieurs `<html>` et `<body>`.

**Solution** :

- Garder `<html>` et `<body>` uniquement dans `src/app/layout.tsx`
- Supprimer ces balises des autres layouts

#### ❌ Erreur "Not a directory (os error 20)"

**Problème** : Nixpacks ne peut pas créer le Dockerfile à cause de permissions.

**Solution** :

- Utiliser des commandes npm directes
- Éviter les fichiers de configuration Nixpacks complexes

## 🌐 Déploiement avec Railway (Alternative)

### Avantages

- Déploiement ultra-simple
- Scaling automatique
- Custom domains inclus
- Base de données PostgreSQL incluse

### Configuration

1. Connecter le repository GitHub
2. Railway détecte automatiquement Next.js
3. Ajouter les variables d'environnement
4. Déploiement automatique

### Variables Railway

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🐳 Déploiement avec Docker

### Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    restart: unless-stopped
```

## 🔧 Configuration du domaine personnalisé

### Avec Coolify

1. Ajouter le domaine dans Coolify
2. Configurer les DNS (A record vers l'IP du VPS)
3. SSL automatique avec Let's Encrypt

### Avec Railway

1. Ajouter le domaine dans Railway
2. Configurer les DNS (CNAME vers railway.app)
3. SSL automatique

## 📊 Monitoring et logs

### Coolify

- Logs en temps réel dans l'interface
- Métriques de performance
- Alertes automatiques

### Railway

- Logs structurés
- Métriques détaillées
- Monitoring des erreurs

## 🔒 Sécurité en production

### Variables d'environnement

- Ne jamais commiter les clés de production
- Utiliser des secrets sécurisés
- Rotation régulière des clés

### SSL/TLS

- Certificats automatiques avec Let's Encrypt
- Redirection HTTP vers HTTPS
- Headers de sécurité

### Base de données

- RLS activé sur toutes les tables
- Connexions sécurisées
- Backups automatiques

## 🚨 Troubleshooting

### Le site ne se charge pas

1. Vérifier les logs de déploiement
2. Contrôler les variables d'environnement
3. Vérifier la configuration DNS

### Erreurs 500

1. Vérifier les logs d'application
2. Contrôler la connexion Supabase
3. Vérifier les permissions RLS

### Problèmes d'authentification

1. Vérifier les URLs de redirection
2. Contrôler les cookies de session
3. Vérifier la configuration Supabase

## 📈 Optimisations de performance

### Build

- Utiliser `npm ci` pour des installations plus rapides
- Optimiser les images avec next/image
- Minimiser les bundles JavaScript

### Runtime

- Mise en cache des requêtes avec React Query
- Optimisation des requêtes Supabase
- Lazy loading des composants

### Monitoring

- Surveiller les métriques de performance
- Optimiser les requêtes lentes
- Monitoring des erreurs utilisateur

---

**Pour toute question sur le déploiement, consulter les logs et vérifier la configuration des variables d'environnement.**
