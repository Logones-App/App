# 🚀 GUIDE DÉPLOIEMENT COOLIFY/VPS

## 📋 PRÉREQUIS

### VPS Requirements

- **OS :** Ubuntu 20.04+ ou Debian 11+
- **RAM :** Minimum 2GB (4GB recommandé)
- **CPU :** 2 vCPUs minimum
- **Storage :** 20GB minimum
- **Ports :** 80, 443, 3000

### Coolify Installation

```bash
# Installation Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Accès à l'interface
http://VOTRE_IP:3000
```

---

## 🔧 CONFIGURATION COOLIFY

### 1. **Créer un nouveau projet**

- **Type :** Application
- **Source :** Git Repository
- **Repository :** Votre repo GitHub/GitLab
- **Branch :** main

### 2. **Configuration Build**

```yaml
# Build Configuration
Build Pack: Dockerfile
Dockerfile Path: ./Dockerfile
Port: 3000
```

### 3. **Variables d'Environnement**

```env
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_BASE_PATH=/
NEXT_PUBLIC_SUPABASE_URL=https://vhjaiftoxttkygixepkw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamFpZnRveHR0a3lnaXhlcGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4ODAxMDEsImV4cCI6MjA1NDQ1NjEwMX0.R9wPsOD6kntkXd3O0n9N3LW4l8Tgvx8spr9y4Fmx5Og
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamFpZnRveHR0a3lnaXhlcGt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg4MDEwMSwiZXhwIjoyMDU0NDU2MTAxfQ.XW4TPpXCaLGQ5M61rcmej8ZlUmeZYYQ7BeKKHY11d3s
BREVO_SMTP_USER=8f4071001@smtp-brevo.com
BREVO_SMTP_PASSWORD=c7KCzndYEODTaNsq
EMAIL_FROM=noreply@la-plank-des-gones.fr
```

### 4. **Configuration Domaine**

- **Domain :** votre-domaine.com
- **SSL :** Let's Encrypt (automatique)
- **Proxy :** Nginx (automatique)

---

## 🐳 DOCKER CONFIGURATION

### Build Command

```bash
# Coolify utilise automatiquement le Dockerfile
# Pas de commande build personnalisée nécessaire
```

### Health Check

```yaml
# Health Check Configuration
Path: /
Port: 3000
Interval: 30s
Timeout: 10s
Retries: 3
```

---

## 🔄 DÉPLOIEMENT

### 1. **Premier Déploiement**

1. Cliquer sur "Deploy"
2. Attendre la fin du build (5-10 minutes)
3. Vérifier les logs de build

### 2. **Déploiements Automatiques**

- **Auto-deploy :** Activé
- **Branch :** main
- **Trigger :** Push sur main

### 3. **Rollback**

- **Automatique :** En cas d'échec
- **Manuel :** Via l'interface Coolify

---

## 📊 MONITORING

### Logs

- **Application Logs :** Interface Coolify
- **Docker Logs :** `docker logs container-name`
- **Nginx Logs :** `/var/log/nginx/`

### Métriques

- **CPU Usage :** Interface Coolify
- **Memory Usage :** Interface Coolify
- **Disk Usage :** Interface Coolify

---

## 🔧 MAINTENANCE

### Mise à Jour

```bash
# Via Coolify Interface
1. Aller dans le projet
2. Cliquer "Redeploy"
3. Ou faire un push sur main
```

### Backup

- **Database :** Supabase (automatique)
- **Code :** Git (automatique)
- **Configuration :** Coolify (automatique)

---

## 🚨 TROUBLESHOOTING

### Erreurs Communes

#### Build Failed

```bash
# Vérifier les logs
1. Aller dans "Build Logs"
2. Identifier l'erreur
3. Corriger le code
4. Redéployer
```

#### Application Not Starting

```bash
# Vérifier les variables d'environnement
1. Aller dans "Environment Variables"
2. Vérifier que toutes les variables sont définies
3. Redéployer
```

#### Domain Not Working

```bash
# Vérifier la configuration DNS
1. Pointer le domaine vers l'IP du VPS
2. Attendre la propagation DNS (24-48h)
3. Vérifier SSL dans Coolify
```

---

## 📈 OPTIMISATIONS

### Performance

- **Caching :** Next.js automatique
- **Compression :** Gzip activé
- **CDN :** Cloudflare (optionnel)

### Sécurité

- **SSL :** Let's Encrypt automatique
- **Headers :** Sécurité Next.js
- **Firewall :** UFW sur VPS

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] VPS configuré avec Coolify
- [ ] Repository connecté
- [ ] Variables d'environnement définies
- [ ] Domaine configuré
- [ ] SSL activé
- [ ] Application déployée
- [ ] Tests fonctionnels
- [ ] Monitoring activé
- [ ] Backup configuré

---

**STATUT :** Prêt pour déploiement
**DERNIÈRE MODIFICATION :** $(date)
**AUTEUR :** Assistant IA
