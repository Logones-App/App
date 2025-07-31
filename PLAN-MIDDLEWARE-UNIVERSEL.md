# PLAN : Solution 1 - Middleware Universel

## **Contexte et Problème**

### **Architecture actuelle :**

- **Domaine principal** : `logones.fr` → gère tous les établissements avec slug dans l'URL
- **Domaines personnalisés** : `logones.com` → proxy vers `logones.fr` avec le slug ajouté automatiquement

### **Problème identifié :**

- La page `success` ne fonctionne pas sur les domaines personnalisés
- Le middleware a une logique spéciale pour `/booking/` qui casse le proxy
- Redirection vers `/booking` au lieu de la page success

### **Contraintes :**

1. **SEO** : URLs doivent être SEO-friendly avec noms d'établissements
2. **Architecture mixte** : Certains établissements ont un domaine perso, d'autres non
3. **Pas de duplication** : Un seul code à maintenir
4. **Proxy transparent** : Domaines perso doivent pointer vers logones.fr
5. **Référencement naturel** : Contenu spécifique à chaque établissement

## **Solution 1 : Middleware Universel**

### **Principe :**

Le middleware traite **TOUTES** les URLs de la même façon, peu importe si elles ont des paramètres ou non.

### **Avantages :**

- ✅ **Une seule logique** pour toutes les URLs
- ✅ **Pas de cas particuliers**
- ✅ **Code simple** et maintenable
- ✅ **Fonctionne** pour toutes les URLs futures
- ✅ **SEO préservé** avec les slugs sur logones.fr

## **Plan d'implémentation**

### **Étape 1 : Nettoyage des fichiers inutiles**

- [x] Supprimer le dossier `/booking/` sans slug
- [x] Supprimer les pages créées sans slug
- [x] Garder l'architecture existante avec `/[slug]/booking/`

### **Étape 2 : Modification du middleware**

**Fichier :** `src/middleware/auth-middleware.ts`

**Action :** Supprimer la logique spéciale pour `/booking/`

**Code à supprimer :**

```typescript
// 4.5. GÉRER LES PAGES BOOKING (nouvelle architecture sans slug dans l'URL)
if (cleanPathname.startsWith("/booking/")) {
  // Pour la nouvelle architecture, on ne proxy pas les pages booking
  // car elles gèrent leur propre état via Zustand
  console.log(`🎯 [Middleware] Page booking détectée, passage direct`);
  return NextResponse.next();
}
```

**Résultat :** Le middleware traitera toutes les URLs de manière universelle

### **Étape 3 : Test des URLs**

**URLs à tester :**

1. **Domaine principal :**

   - `logones.fr/fr/la-plank-des-gones/booking` ✅
   - `logones.fr/fr/la-plank-des-gones/booking/success` ✅
   - `logones.fr/fr/la-plank-des-gones/booking/slots/2025-01-31` ✅
   - `logones.fr/fr/la-plank-des-gones/booking/confirm/2025-01-31/19-00` ✅

2. **Domaine personnalisé :**
   - `logones.com/booking` → Proxy vers `logones.fr/fr/la-plank-des-gones/booking` ✅
   - `logones.com/booking/success` → Proxy vers `logones.fr/fr/la-plank-des-gones/booking/success` ✅
   - `logones.com/booking/slots/2025-01-31` → Proxy vers `logones.fr/fr/la-plank-des-gones/booking/slots/2025-01-31` ✅
   - `logones.com/booking/confirm/2025-01-31/19-00` → Proxy vers `logones.fr/fr/la-plank-des-gones/booking/confirm/2025-01-31/19-00` ✅

### **Étape 4 : Vérification du SEO**

**Vérifications :**

- [ ] URLs avec slug préservées sur logones.fr
- [ ] Contenu spécifique à chaque établissement
- [ ] Référencement naturel optimisé
- [ ] Pas de duplication de contenu

### **Étape 5 : Tests de navigation**

**Scénarios à tester :**

1. **Réservation complète sur domaine principal :**

   - Aller sur `logones.fr/fr/la-plank-des-gones/booking`
   - Sélectionner une date
   - Sélectionner un créneau
   - Remplir le formulaire
   - Vérifier la redirection vers la page success

2. **Réservation complète sur domaine personnalisé :**
   - Aller sur `logones.com/booking`
   - Sélectionner une date
   - Sélectionner un créneau
   - Remplir le formulaire
   - Vérifier la redirection vers la page success

### **Étape 6 : Optimisations**

**Améliorations possibles :**

- [ ] Cache du middleware pour les performances
- [ ] Gestion des erreurs 404 améliorée
- [ ] Logs détaillés pour le debugging
- [ ] Tests automatisés

## **Architecture finale**

### **Structure des URLs :**

```
logones.fr/fr/[slug]/booking/...  (domaine principal)
logones.com/booking/...            (domaine personnalisé → proxy)
```

### **Flux de données :**

1. **Middleware** détecte le domaine
2. **Middleware** récupère l'établissement associé
3. **Middleware** construit l'URL cible avec le slug
4. **Middleware** proxy vers logones.fr
5. **Middleware** modifie le HTML pour remplacer les URLs
6. **Middleware** retourne la réponse

### **Avantages de cette solution :**

- ✅ **Simplicité** : Une seule logique pour tout
- ✅ **Maintenabilité** : Code simple et clair
- ✅ **Extensibilité** : Fonctionne pour toutes les URLs futures
- ✅ **SEO** : URLs optimisées pour le référencement
- ✅ **Performance** : Proxy transparent et efficace

## **Risques et mitigation**

### **Risques identifiés :**

1. **Performance** : Proxy peut être lent

   - _Mitigation_ : Cache et optimisation du middleware

2. **Erreurs 404** : Pages inexistantes

   - _Mitigation_ : Gestion d'erreur améliorée

3. **SEO** : Duplication de contenu
   - _Mitigation_ : URLs canoniques et meta tags appropriés

### **Tests de régression :**

- [ ] Toutes les pages existantes fonctionnent
- [ ] Navigation entre les pages
- [ ] Formulaires et soumissions
- [ ] Emails et notifications
- [ ] Responsive design

## **Conclusion**

La **Solution 1 : Middleware Universel** est la solution la plus simple et efficace pour résoudre le problème de la page success sur les domaines personnalisés. Elle respecte toutes les contraintes et offre une architecture claire et maintenable.

**Prochaines étapes :**

1. Appliquer la modification du middleware
2. Tester toutes les URLs
3. Vérifier le SEO
4. Optimiser les performances si nécessaire
