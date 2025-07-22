# 📝 CODEBASE REVIEW TODO

Ce fichier liste tous les points à corriger/améliorer suite à la revue de code complète, avec leur priorité et un suivi de statut.

| Zone/Fichier                                  | Problème/Incohérence                                     | Recommandation                                 | Priorité     | Statut     |
| --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- | ------------ | ---------- |
| src/lib/stores/workspace-store.ts             | State global d’orga encore présent                       | Supprimer le store et nettoyer tous les usages | Critique     | ✅ Fait    |
| src/lib/stores/auth-store.ts                  | State global d’orga/role encore présent                  | Supprimer propriétés/setters inutiles          | Critique     | ✅ Fait    |
| Utilisation des stores (global)               | Imports/usages d’orga global dans pages/components admin | Refactoriser pour tout passer par l’URL/profil | Critique     | ✅ Fait    |
| Queries/services (ex: useCurrentOrganization) | Utilisent encore le state global d’orga                  | Refactoriser pour utiliser l’URL/profil user   | Critique     | ✅ Fait    |
| use-orga-user-organization-id.ts              | Ne gère qu’un seul ID d’orga pour org_admin              | Documenter ou généraliser multi-orga           | Amélioration | ⬜ À faire |
| Scripts (SQL/maintenance)                     | Scripts obsolètes ou non centralisés                     | Nettoyer, centraliser, documenter              | Important    | ⬜ À faire |
| Feedback UI (global)                          | Messages de chargement/erreur non uniformes              | Refactoriser pour uniformiser les feedbacks    | Amélioration | ⬜ À faire |
| Tests & documentation                         | Procédures critiques pas toujours testées/documentées    | Ajouter checklists, guides, tests              | Amélioration | ⬜ À faire |

---

## Légende

- **Critique** : Doit être corrigé en priorité (cohérence, sécurité, architecture)
- **Important** : Amélioration forte, mais non bloquante
- **Amélioration** : Pour la qualité, la maintenabilité, l’UX
- **Statut** : ⬜ À faire / 🟡 En cours / ✅ Fait

---

## Suivi

- Mettre à jour ce fichier à chaque correction.
- Ajouter tout nouveau point détecté lors des évolutions.

---

**Dernière mise à jour : $(date)**
