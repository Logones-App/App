# [ARCHIVÉ] Voir les guides principaux pour les plans de test auth

Ce document est obsolète. Le plan de test manuel est désormais intégré dans les annexes de `AUTHENTICATION-GUIDE.md`.

---

# Plan de test d'authentification

Ce document décrit le plan de test manuel pour vérifier le bon fonctionnement du système d'authentification dans le dashboard administratif.

## 1. Tests de connexion

### Test de connexion réussi

1. Accéder à la page de connexion (`/auth/login`)
2. Entrer des identifiants valides
3. Cliquer sur le bouton "Se connecter"
4. **Résultat attendu**:
   - Un toast de succès s'affiche avec le message "Connexion réussie" et "Bon retour !"
   - L'utilisateur est redirigé vers `/dashboard`
   - Les composants du tableau de bord sont correctement chargés

### Test d'échec de connexion

1. Accéder à la page de connexion
2. Entrer des identifiants invalides
3. Cliquer sur le bouton "Se connecter"
4. **Résultat attendu**:
   - Un toast d'erreur s'affiche avec le message "Échec de la connexion"
   - Un message d'erreur s'affiche dans le formulaire
   - L'utilisateur reste sur la page de connexion

### Test de validation du formulaire

1. Accéder à la page de connexion
2. Tenter de soumettre le formulaire sans remplir les champs
3. **Résultat attendu**:
   - Des messages de validation HTML5 s'affichent
   - Le formulaire n'est pas soumis

## 2. Tests de déconnexion

### Test de déconnexion depuis le menu utilisateur

1. Se connecter avec des identifiants valides
2. Cliquer sur l'avatar utilisateur pour ouvrir le menu
3. Cliquer sur "Déconnexion"
4. **Résultat attendu**:
   - Un toast de succès s'affiche avec le message "Déconnexion réussie" et "Vous avez été déconnecté"
   - L'utilisateur est redirigé vers `/auth/login`
   - La session est correctement terminée (vérifiez en essayant d'accéder à une page protégée)

## 3. Tests de protection des routes

### Test d'accès non autorisé

1. Se déconnecter complètement
2. Tenter d'accéder directement à une page protégée (ex: `/dashboard`)
3. **Résultat attendu**:
   - L'utilisateur est redirigé vers `/auth/login`
   - Aucune donnée du tableau de bord n'est visible

### Test de persistance de session

1. Se connecter avec des identifiants valides
2. Rafraîchir la page du tableau de bord
3. **Résultat attendu**:
   - L'utilisateur reste connecté
   - Le tableau de bord est toujours accessible

## 4. Tests d'internationalisation

### Test de connexion en français

1. Changer la langue en français
2. Effectuer le processus de connexion
3. **Résultat attendu**:
   - Tous les messages, y compris les toasts, sont en français
   - La redirection préserve la locale sélectionnée

### Test de connexion en anglais

1. Changer la langue en anglais
2. Effectuer le processus de connexion
3. **Résultat attendu**:
   - Tous les messages, y compris les toasts, sont en anglais
   - La redirection préserve la locale sélectionnée

## 5. Tests de réactivité

### Test sur mobile

1. Utiliser un émulateur mobile ou réduire la taille de la fenêtre
2. Effectuer le processus de connexion et déconnexion
3. **Résultat attendu**:
   - L'interface s'adapte correctement
   - Les toasts sont visibles et lisibles
   - Le processus d'authentification fonctionne de la même manière

## Notes pour les testeurs

- Testez avec différents navigateurs (Chrome, Firefox, Safari, Edge)
- Testez avec différentes tailles d'écran
- Vérifiez que tous les messages sont correctement traduits dans la langue sélectionnée
- Assurez-vous que les états de chargement sont correctement gérés et visibles

## Rapport de bug

Si vous trouvez un bug lors des tests, veuillez le documenter avec:

1. Une description du problème
2. Les étapes pour reproduire
3. Le comportement attendu vs le comportement observé
4. Des captures d'écran si applicable
5. Les informations sur l'environnement (navigateur, taille d'écran, etc.)
