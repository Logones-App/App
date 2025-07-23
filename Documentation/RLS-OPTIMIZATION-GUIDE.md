# ⚠️ NOTE IMPORTANTE

> **Pour toute génération de script RLS, se référer exclusivement à `RLS-POLICIES-STANDARD.md` qui fait foi pour le standard universel du projet. Ce fichier est un guide d'optimisation et d'explication, pas un template direct.**

# Guide d'Optimisation des Politiques RLS - Architecture Unifiée

## 📋 Résumé de la Solution

### Problème Initial

- ❌ Erreur `permission denied for table users`
- ❌ Politiques RLS complexes avec distinction par rôle
- ❌ Références à des tables inaccessibles (`users`, `users_roles`)
- ❌ Architecture incohérente entre les tables

### Solution Appliquée

- ✅ Architecture unifiée basée sur `users_organizations`
- ✅ Politiques RLS simplifiées et cohérentes
- ✅ Pas de distinction par rôle dans les politiques RLS
- ✅ Sécurité maintenue avec accès par organisation

## 🏗️ Architecture Optimisée

### Principe Fondamental

**Tous les utilisateurs (`system_admin`, `org_admin`, `user`) sont associés à des organisations via `users_organizations`**

### Logique RLS Unifiée

```sql
-- Politique universelle pour toutes les tables
CREATE POLICY "table_select_universal" ON table_name
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );
```

## 📊 Structure des Rôles

### Rôles dans l'Application (Métadonnées JWT)

- **`system_admin`** : Accès complet à toutes les organisations
- **`org_admin`** : Accès limité à ses organisations
- **`user`** : Accès limité à ses organisations

### Rôles dans les Politiques RLS

- **Aucune distinction** : Toutes les politiques utilisent la même logique
- **Basé uniquement** sur `users_organizations`
- **Sécurité** : Chaque utilisateur n'accède qu'à ses organisations

## 🔧 Tables et Politiques RLS

### 1. `users_organizations` (Table de Liaison)

```sql
-- Politiques simples (accès complet pour les requêtes internes)
CREATE POLICY "users_organizations_select_all" ON users_organizations
    FOR SELECT TO authenticated USING (true);
```

### 2. `organizations` (Organisations)

```sql
-- Accès basé sur les associations
CREATE POLICY "organizations_select_universal" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );
```

### 3. `establishments` (Établissements)

```sql
-- Accès basé sur les associations
CREATE POLICY "establishments_select_universal" ON establishments
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );
```

### 4. `messages` (Messages - si la table existe)

```sql
-- Même logique que establishments
CREATE POLICY "messages_select_universal" ON messages
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );
```

## 🚀 Généralisation pour Nouvelles Tables

### Étapes pour Ajouter une Nouvelle Table

#### 1. Structure de la Table

```sql
CREATE TABLE new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    -- autres colonnes...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false
);
```

#### 2. Activer RLS

```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

#### 3. Créer les Politiques Universelles

```sql
-- SELECT
CREATE POLICY "new_table_select_universal" ON new_table
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );

-- INSERT
CREATE POLICY "new_table_insert_universal" ON new_table
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );

-- UPDATE
CREATE POLICY "new_table_update_universal" ON new_table
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );

-- DELETE
CREATE POLICY "new_table_delete_universal" ON new_table
    FOR DELETE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );
```

## ⚠️ Points d'Attention

### 1. Association des Utilisateurs

- **Toujours associer** les utilisateurs aux organisations via `users_organizations`
- **Utiliser l'UUID** plutôt que l'email pour les requêtes
- **Vérifier les associations** avant de tester les politiques RLS

### 2. Ordre d'Activation RLS

- **Activer RLS** sur `users_organizations` en premier
- **Créer les politiques** sur `users_organizations` avant les autres tables
- **Tester l'accès** après chaque modification

### 3. Gestion des Erreurs

- **Erreur `permission denied for table users`** : Vérifier les politiques sur `users_organizations`
- **Données vides** : Vérifier les associations dans `users_organizations`
- **Erreurs 403** : Vérifier que l'utilisateur est bien associé à l'organisation

### 4. Performance

- **Index** : Créer des index sur `organization_id` et `user_id`
- **Requêtes** : Éviter les sous-requêtes complexes dans les politiques
- **Cache** : Utiliser le cache de l'application pour les associations fréquentes

## 🔍 Scripts de Diagnostic

### Vérifier l'État des Politiques

```sql
-- État RLS des tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('organizations', 'establishments', 'users_organizations');

-- Politiques existantes
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
```

### Vérifier les Associations

```sql
-- Associations d'un utilisateur
SELECT uo.user_id, uo.organization_id, o.name
FROM users_organizations uo
JOIN organizations o ON uo.organization_id = o.id
WHERE uo.user_id = 'UUID_UTILISATEUR' AND uo.deleted = false;
```

### Tester l'Accès

```sql
-- Test d'accès aux établissements
SELECT COUNT(*) FROM establishments
WHERE organization_id = 'UUID_ORGANISATION' AND deleted = false;

-- Test d'accès aux organisations
SELECT COUNT(*) FROM organizations
WHERE id = 'UUID_ORGANISATION' AND deleted = false;
```

## 🎯 Avantages de cette Architecture

### 1. Simplicité

- ✅ **Une seule logique** pour toutes les tables
- ✅ **Politiques cohérentes** et prévisibles
- ✅ **Facile à maintenir** et déboguer

### 2. Sécurité

- ✅ **Isolation par organisation** garantie
- ✅ **Pas d'accès croisé** entre organisations
- ✅ **Contrôle granulaire** via `users_organizations`

### 3. Évolutivité

- ✅ **Facile d'ajouter** de nouvelles tables
- ✅ **Réutilisable** pour tous les projets
- ✅ **Scalable** avec de nombreuses organisations

### 4. Performance

- ✅ **Requêtes optimisées** avec index appropriés
- ✅ **Cache possible** pour les associations
- ✅ **Moins de complexité** dans les politiques RLS

## 📝 Checklist de Mise en Place

### Pour Chaque Nouvelle Table

- [ ] Ajouter `organization_id` et `deleted` à la table
- [ ] Activer RLS sur la table
- [ ] Créer les 4 politiques universelles (SELECT, INSERT, UPDATE, DELETE)
- [ ] Tester l'accès avec un utilisateur associé
- [ ] Vérifier la sécurité avec un utilisateur non associé

### Pour Chaque Nouvel Utilisateur

- [ ] Créer l'utilisateur dans `auth.users`
- [ ] Définir le rôle dans `raw_app_meta_data`
- [ ] Créer les associations dans `users_organizations`
- [ ] Tester l'accès aux organisations associées

### Pour Chaque Nouvelle Organisation

- [ ] Créer l'organisation dans `organizations`
- [ ] Associer les utilisateurs appropriés dans `users_organizations`
- [ ] Tester l'accès pour chaque utilisateur associé

## 🚨 Problèmes Courants et Solutions

### 1. "permission denied for table users"

**Cause** : Politiques RLS sur `users_organizations` manquantes ou incorrectes
**Solution** : Activer RLS et créer des politiques simples sur `users_organizations`

### 2. Données vides malgré les associations

**Cause** : Politiques RLS trop restrictives ou associations incorrectes
**Solution** : Vérifier les associations et simplifier les politiques

### 3. Erreurs 403 sur certaines requêtes

**Cause** : Utilisateur non associé à l'organisation demandée
**Solution** : Créer l'association dans `users_organizations`

### 4. Performance lente

**Cause** : Manque d'index ou politiques RLS complexes
**Solution** : Ajouter des index et simplifier les politiques

## 🎉 Conclusion

Cette architecture unifiée résout les problèmes de complexité des politiques RLS tout en maintenant la sécurité. Elle est :

- **Simple** à comprendre et maintenir
- **Sécurisée** avec isolation par organisation
- **Évolutive** pour de nouvelles tables et fonctionnalités
- **Performante** avec des requêtes optimisées

L'approche "tous les utilisateurs sont associés à des organisations" simplifie grandement la gestion des permissions tout en maintenant la flexibilité nécessaire pour différents niveaux d'accès.
