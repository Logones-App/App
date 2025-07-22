# 🛠️ GUIDE PROCÉDURE CRITIQUE – Ajout d’une nouvelle entité métier

## 1. Créer la table SQL

- [ ] Ajouter la colonne `organization_id` (UUID, FK vers organizations)
- [ ] Ajouter la colonne `deleted` (boolean, default false)
- [ ] Ajouter les colonnes métier nécessaires

## 2. Activer RLS

- [ ] `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`

## 3. Créer les politiques RLS universelles

- [ ] SELECT : accès si organization_id dans users_organizations
- [ ] INSERT : vérification de l’organization_id
- [ ] UPDATE : accès et vérification de l’organization_id
- [ ] DELETE : accès si organization_id dans users_organizations

## 4. Activer le realtime (si besoin)

- [ ] `ALTER PUBLICATION supabase_realtime ADD TABLE new_table;`

## 5. Créer le service/hook realtime dédié

- [ ] Créer un module dans `src/lib/services/realtime/modules/`
- [ ] Créer un hook dans `src/hooks/` (ex : useNewEntityRealtime)

## 6. Intégrer dans l’UI

- [ ] Utiliser le composant DataTable partagé
- [ ] Passer l’ID d’orga en prop (URL pour system_admin, profil user pour org_admin)
- [ ] Uniformiser les feedbacks UI

## 7. Tester et documenter

- [ ] Vérifier l’accès RLS (audit, tests)
- [ ] Vérifier le realtime (ajout, modif, suppression)
- [ ] Ajouter la doc dans le README/scripts

---

**À suivre pour chaque nouvelle entité métier.**
