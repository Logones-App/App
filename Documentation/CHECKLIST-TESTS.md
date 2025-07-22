# ✅ CHECKLIST DE TESTS MANUELS – SaaS Dashboard

## Authentification & Rôles

- [ ] Connexion/déconnexion utilisateur (system_admin, org_admin)
- [ ] Redirection correcte selon le rôle
- [ ] Accès refusé pour utilisateur non authentifié

## Gestion des organisations

- [ ] system_admin : navigation entre plusieurs organisations via l’URL
- [ ] org_admin : accès à son organisation uniquement (profil user)
- [ ] Sélecteur d’orga admin fonctionne (router.push)
- [ ] Aucune dépendance à un state global d’orga

## Realtime

- [ ] Ajout/modification/suppression d’entité visible en temps réel
- [ ] Statut de connexion realtime affiché
- [ ] Nettoyage des canaux à la déconnexion

## RLS & Sécurité

- [ ] Aucune donnée d’une autre organisation accessible
- [ ] system_admin associé à toutes les organisations
- [ ] Audit des politiques RLS (script d’audit)

## i18n & UI

- [ ] Changement de langue via le LanguageSwitcher (cookie + URL)
- [ ] Feedback UI uniforme (chargement, erreur, succès)
- [ ] Tous les messages traduits (pas de texte en dur)

## Scripts & Maintenance

- [ ] Scripts SQL utiles documentés et testés
- [ ] Suppression des scripts obsolètes

## Documentation

- [ ] Guides à jour pour chaque procédure critique (ajout d’entité, migration, rollback)

---

**À valider avant chaque release majeure.**
