# 📜 Scripts SQL & Maintenance – SaaS Dashboard

> **🟢 Points critiques à retenir (post-migration RLS)**
>
> - Les policies RLS universelles sont obligatoires pour la sécurité multi-organisation.
> - Toujours vérifier que les colonnes utilisées dans les policies (`organization_id`, `establishment_id`) sont bien renseignées lors des migrations.
> - Les droits GRANT n'ouvrent pas d'accès si la RLS est bien configurée.
> - Le realtime Supabase respecte la RLS, aucun besoin de policies spécifiques pour le mobile.
> - Les rôles sont désormais stockés dans les métadonnées utilisateur, plus dans une table `users_roles`.
> - Les associations utilisateurs/organisations sont gérées via `users_organizations`.
> - Pour toute nouvelle table, appliquer d'abord la RLS universelle puis adapter si besoin.
> - Archiver un audit global des policies après chaque migration majeure.

Ce dossier contenait tous les scripts utiles pour la maintenance, l’audit, la migration et le diagnostic du projet.

## 📋 Convention
- **Chaque script devait avoir un commentaire en tête** expliquant son usage, le contexte, et les précautions éventuelles.
- **Ce README devait être mis à jour** à chaque ajout/suppression de script.
- **Supprimer les scripts obsolètes ou redondants** après validation.

---

## 🗂️ Scripts principaux

> **Tous les scripts SQL ont été supprimés après la migration et la validation complète du système.**
> 
> La documentation, la checklist de migration et l’audit global des policies font désormais foi pour la maintenance et la conformité.
> 
> Pour toute nouvelle migration, se référer à la documentation et générer de nouveaux scripts si besoin ponctuel.

---

## 🧹 À faire
- Archiver la documentation et l’audit global après chaque migration majeure.
- Documenter la procédure d’utilisation des scripts critiques (audit, migration, rollback, etc.).

---
