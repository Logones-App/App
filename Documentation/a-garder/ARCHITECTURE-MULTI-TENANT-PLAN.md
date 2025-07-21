# 🏢 Plan d’Architecture Multi-Tenant & UX - SaaS Dashboard

## 1. 🎯 Contexte & Objectifs

- **Deux profils principaux** :
  - **system_admin** : gère plusieurs organisations, accès à des outils globaux, la gestion d’orga/établissement n’est qu’un module parmi d’autres.
  - **org_admin** : immergé dans “son” organisation, aucune notion de multi-orga, tout est filtré automatiquement.
- **Besoins** :
  - Réutilisabilité maximale des pages et composants
  - Sécurité et simplicité des accès (RLS, permissions)
  - UX adaptée à chaque profil, sans duplication de code

---

## 2. 🏗️ Principes d’Architecture

### a. Association user ↔ organisation

- Table pivot `users_organizations` (user_id, organization_id, rôle, deleted...)
- Le rôle (system_admin/org_admin) est stocké dans les métadonnées Supabase, utilisé pour l’UI/permissions, jamais dans la RLS

### b. Politiques RLS unifiées

- Toutes les politiques RLS (SELECT, UPDATE, etc.) sur les tables métiers sont basées sur :
  ```sql
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = auth.uid() AND deleted = false
  )
  ```
- Aucune distinction de rôle dans la RLS

### c. Routing & Source de vérité de l’ID d’organisation

- **Pour system_admin** : l’ID d’organisation est toujours dans l’URL (`/admin/organizations/[organizationId]/...`)
- **Pour org_admin** : l’ID d’orga est déduit du profil utilisateur à la connexion (pas dans l’URL)
- Les composants/pages sont partagés, seule la source de l’ID d’orga change

### d. State global d’orga

- **Suppression du state global d’orga pour system_admin** : tout passe par l’URL
- Pour org_admin, l’ID d’orga est fixé à la connexion (profil user)

### e. Sélecteur d’organisation

- Pour system_admin, le sélecteur d’orga ne fait qu’un `router.push` vers la nouvelle URL
- Pas de sélecteur pour org_admin

### f. Hooks/queries

- Toujours prendre `organizationId` en paramètre (extrait de l’URL pour system_admin, du profil user pour org_admin)
- Les permissions sont calculées à la volée selon le rôle et l’orga

### g. Composants/pages partagés

- Même logique, même affichage, seule la source de l’ID d’orga change
- Les composants métiers sont agnostiques au rôle

---

## 3. 🖥️ Conventions UX/UI par rôle

### system_admin

- Dashboard = “hub” multi-fonctions (analytics, logs, gestion utilisateurs, etc.)
- Section “Gestion d’organisation” avec sélecteur d’orga (dropdown, sidebar…)
- Peut “zoomer” sur une orga pour la gérer, puis revenir à la vue globale
- Le contexte d’orga n’impacte que la section gestion d’orga/établissement
- L’ID d’orga est toujours dans l’URL

### org_admin

- Jamais de sélecteur d’orga
- L’`organizationId` est déterminé automatiquement à la connexion (profil user)
- Tout l’UI, toutes les données, tous les modules sont filtrés par cette organisation, de façon transparente
- Les menus, titres, labels sont naturels et directs (“Mes établissements”, “Mes réservations”, etc.)
- Aucune notion de “multi-orga”

---

## 4. 📝 Plan d’action détaillé (routing & logique partagée)

### 1. Refactoriser les routes pour system_admin

- Toutes les pages métiers sont accessibles via `/admin/organizations/[organizationId]/...`
- Les détails d’entité : `/admin/organizations/[organizationId]/[entity]/[entityId]`
- Le sélecteur d’orga fait un `router.push` vers la nouvelle URL

### 2. Adapter les hooks/queries

- Tous les hooks/queries métiers prennent `organizationId` en paramètre
- Pour system_admin, l’ID vient de l’URL (via `useParams` ou équivalent)
- Pour org_admin, l’ID vient du profil utilisateur

### 3. Supprimer le state global d’orga pour system_admin

- Plus de Zustand/store pour l’orga courante côté admin
- Les composants lisent l’ID d’orga depuis l’URL

### 4. Uniformiser les composants/pages

- Les composants métiers sont partagés entre system_admin et org_admin
- Les permissions sont calculées à la volée selon le rôle et l’orga

### 5. Documenter la convention

- Ajouter une section dans la doc expliquant la gestion de l’ID d’orga et la logique partagée

### 6. Tests

- Vérifier tous les parcours system_admin (multi-orga, navigation, partage d’URL)
- Vérifier tous les parcours org_admin (expérience immergée, aucune notion de multi-orga)

---

## 5. 🔄 Résumé des conventions de routing et de contexte

- **system_admin** :
  - L’ID d’orga est toujours dans l’URL
  - Le sélecteur d’orga fait un router.push
  - Les hooks/queries lisent l’ID d’orga depuis l’URL
- **org_admin** :
  - L’ID d’orga est déduit du profil utilisateur
  - Pas de sélecteur d’orga
  - Les hooks/queries lisent l’ID d’orga depuis le profil user
- **Composants/pages** :
  - Toujours partagés, reçoivent l’ID d’orga en paramètre
  - Permissions calculées dynamiquement

---

## 6. 🔎 Exemple de structure de route et de logique partagée

```typescript
// Dans la page métier
const params = useParams();
const userOrgId = useUserOrganizationId(); // hook qui retourne l’ID d’orga du user connecté (org_admin)
const organizationId = params.organizationId || userOrgId;

// Utilisation dans les hooks/queries
const { data: establishments } = useEstablishments(organizationId);
```

---

## 7. ⚠️ Points d’attention

- Ne jamais intégrer de logique de rôle dans la RLS (tout passe par l’association)
- Le rôle ne sert qu’à l’UI et à la gestion des permissions côté frontend/backend
- Toujours viser la réutilisabilité maximale des composants/pages
- Documenter et tester chaque évolution

---

**Ce plan garantit une base solide, DRY, évolutive et une UX optimale pour tous les profils.**
