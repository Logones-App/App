# 🧪 Test Middleware - Implémentation Propre

## 🎯 Objectif

Recréer la logique de middleware de zéro, sans se baser sur l'existant, pour avoir une implémentation propre et correcte.

## 📋 Architecture à Implémenter

### **Types de Routes :**
1. **Routes techniques** : `/api`, `/_next`, `/favicon.ico` → PASSAGE DIRECT
2. **Domaines personnalisés** : `la-plank-des-gones.fr` → REDIRECTION VERS DOMAINE PRINCIPAL
3. **Routes publiques** : `/auth/*`, `/` → PASSAGE DIRECT
4. **Routes protégées** : `/admin/*`, `/dashboard/*` → VÉRIFICATION AUTH + RÔLES
5. **Routes restaurants publics** : `/[slug]/*` → PASSAGE DIRECT

### **Logique d'Authentification :**
- **System Admin** → Accès `/admin/*`
- **Org Admin** → Accès `/dashboard/*`
- **Visitor** → Accès public uniquement

### **Ordre de Vérification :**
1. Routes techniques
2. Domaines personnalisés
3. Locale (ajout si manquante)
4. Routes publiques
5. Routes protégées (AVANT les restaurants publics)
6. Routes restaurants publics
7. Route non reconnue → Redirection login

## 🚀 Tests à Effectuer

- [ ] Test routes techniques
- [ ] Test domaines personnalisés
- [ ] Test locales manquantes
- [ ] Test routes publiques
- [ ] Test routes protégées (auth)
- [ ] Test routes restaurants publics
- [ ] Test redirections selon rôles
- [ ] Test contournement d'authentification 