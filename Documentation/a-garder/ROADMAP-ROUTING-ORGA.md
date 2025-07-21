# 🗂️ Roadmap précise – Refacto gestion de l’ID d’organisation dans l’URL (multi-tenant)

## 🎯 Objectif

- Toutes les pages métiers (établissements, menus, utilisateurs, etc.) pour system_admin doivent être accessibles uniquement via une URL du type `/admin/organizations/[organizationId]/...`.
- Pour org_admin, l’ID d’orga est déduit du profil utilisateur (pas dans l’URL).
- Les composants/pages sont partagés entre les deux rôles.
- **Ne pas toucher à `/dashboard1`**.

---

## 📋 Checklist détaillée

### 1. **Lister toutes les pages métiers concernées**

- [ ] Identifier toutes les pages sous `/admin/` qui gèrent des entités liées à une organisation (établissements, menus, utilisateurs, messages, etc.)
- [ ] Exclure `/dashboard1` et ses sous-pages

### 2. **Refactoriser les routes pour system_admin**

- [ ] Déplacer/renommer les pages pour qu’elles soient toutes sous `/admin/organizations/[organizationId]/...`
- [ ] Pour les détails d’entité : `/admin/organizations/[organizationId]/[entity]/[entityId]`
- [ ] Mettre à jour les liens/navigation internes pour router vers ces nouvelles URLs

### 3. **Adapter tous les hooks/queries**

- [ ] Modifier les hooks/queries métiers pour qu’ils prennent toujours `organizationId` en paramètre
- [ ] Dans chaque page, extraire `organizationId` de l’URL via `useParams` (system_admin)
- [ ] Pour org_admin, utiliser un hook qui retourne l’ID d’orga du user connecté (profil utilisateur/métadonnées)
- [ ] Passer systématiquement `organizationId` aux hooks/queries et composants enfants

### 4. **Supprimer le state global d’orga pour system_admin**

- [ ] Retirer toute dépendance à Zustand/store pour l’orga courante côté admin
- [ ] Supprimer les setters/getters inutiles dans le store
- [ ] Adapter les composants qui utilisaient ce state pour lire l’ID d’orga depuis l’URL

### 5. **Adapter le sélecteur d’orga (system_admin)**

- [ ] Le sélecteur d’orga doit faire un `router.push` vers la nouvelle URL avec le bon `organizationId`
- [ ] Vérifier qu’il n’y a plus de logique de state global pour l’orga sélectionnée

### 6. **Uniformiser les composants/pages**

- [ ] S’assurer que tous les composants métiers sont partagés entre system_admin et org_admin
- [ ] Les composants reçoivent toujours un `organizationId` (depuis l’URL ou le profil user)
- [ ] Les permissions sont calculées à la volée selon le rôle et l’orga

### 7. **Documenter la convention**

- [ ] Ajouter une section dans la doc d’architecture expliquant :
  - L’ID d’orga est toujours la source de vérité pour charger les données
  - Pour system_admin : ID dans l’URL
  - Pour org_admin : ID déduit du profil user
  - Les composants/pages sont partagés

### 8. **Tests**

- [ ] Vérifier tous les parcours system_admin (multi-orga, navigation, partage d’URL)
- [ ] Vérifier tous les parcours org_admin (expérience immergée, aucune notion de multi-orga)
- [ ] S’assurer qu’aucune page métier ne dépend encore d’un state global d’orga

---

**Note : Ne pas toucher à `/dashboard1` ni à ses sous-pages.**

**Ce fichier sert de checklist pour la refacto.**
