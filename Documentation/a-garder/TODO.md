# 🗂️ TODO & ROADMAP - SaaS Dashboard Realtime

## 1. Sécurité & Accès

- [ ] **Vérifier les politiques RLS sur toutes les tables critiques**
  - [ ] establishments
  - [ ] organizations
  - [ ] users_organizations
  - [ ] messages
  - [ ] menus
  - [ ] bookings
- [ ] **S’assurer que tous les system_admin sont associés à toutes les organisations**
  - [ ] Script d’association UUID généralisé
  - [ ] Vérification automatique après chaque création d’organisation
- [ ] **Audit final des politiques RLS**
  - [ ] Script d’audit automatique
  - [ ] Rapport d’audit à chaque release
- [ ] **Supprimer toute référence au rôle dans les politiques RLS**
  - [ ] Vérification manuelle et scriptée
- [ ] **Documenter la procédure d’ajout d’une nouvelle table avec realtime et RLS**

## 2. Realtime & UI

- [ ] **Généraliser le système realtime à toutes les entités métiers**
  - [ ] menus
  - [ ] bookings
  - [ ] autres entités à venir
- [ ] **Créer les hooks/services realtime manquants**
  - [ ] useMenusRealtime
  - [ ] useBookingsRealtime
- [ ] **Ajouter le status de connexion realtime sur toutes les pages concernées**
- [ ] **Uniformiser l’affichage des notifications realtime**
- [ ] **Optimiser la gestion des erreurs et reconnexions realtime**
  - [ ] Retry automatique
  - [ ] Feedback UI

## 3. Gestion des organisations & droits

- [ ] **Permettre la sélection d’une organisation pour tous les system_admin**
  - [ ] UI bouton de sélection
  - [ ] Stockage global state
- [ ] **Vérifier la gestion d’une organisation pour tous les rôles**
  - [ ] system_admin
  - [ ] org_admin
- [ ] **Ajouter des tests d’accès pour chaque rôle/scénario**
  - [ ] system_admin
  - [ ] org_admin
  - [ ] user (si jamais réactivé)

## 4. Expérience Utilisateur

- [ ] **Uniformiser les DataTable sur toutes les entités**
  - [ ] Colonnes, actions, pagination, tri
- [ ] **Ajouter des feedbacks utilisateur clairs**
  - [ ] Chargement
  - [ ] Erreurs
  - [ ] Succès
- [ ] **Traduire tous les messages et labels (i18n complet)**

## 5. Scripts & Maintenance

- [ ] **Centraliser tous les scripts SQL utiles**
  - [ ] Diagnostic
  - [ ] Association
  - [ ] Activation realtime
- [ ] **Créer un script d’audit automatique des politiques RLS et associations user/org**
- [ ] **Documenter la procédure de migration/rollback**

## 6. Tests & Qualité

- [ ] **Ajouter des tests unitaires pour les services realtime**
- [ ] **Ajouter des tests d’intégration pour les politiques RLS**
- [ ] **Mettre en place un plan de tests manuels (checklist release)**

## 7. Performance & Monitoring

- [ ] **Optimiser les requêtes pour les grandes tables**
  - [ ] Index
  - [ ] Pagination serveur
- [ ] **Mettre en place un monitoring des connexions realtime**
  - [ ] Logs
  - [ ] Alertes
- [ ] **Documenter les outils de monitoring et debug**

## 8. Documentation

- [ ] **Mettre à jour tous les guides**
  - [ ] Architecture
  - [ ] RLS
  - [ ] Realtime
  - [ ] Onboarding
- [ ] **Créer un guide “Ajout d’une nouvelle entité métier”**
- [ ] **Ajouter des schémas d’architecture (Mermaid, diagrammes)**

---

**Priorités immédiates :**

1. Audit RLS & associations system_admin
2. Généralisation du realtime
3. Uniformisation UI & feedback utilisateur
4. Centralisation scripts & documentation
5. Tests automatisés et manuels

---

_Dernière mise à jour : $(date)_
