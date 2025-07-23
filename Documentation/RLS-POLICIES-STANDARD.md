# 🔒 RLS POLICIES STANDARD - ARCHITECTURE SIMPLE

## 🎯 PRINCIPE FONDAMENTAL

**TOUTES les tables utilisent la même architecture RLS simple :**

- ✅ **`TO authenticated`** (jamais `TO public`)
- ✅ **Basées uniquement sur `users_organizations`**
- ✅ **Pas de distinction par rôle** dans les politiques RLS
- ✅ **Même logique pour toutes les tables**

## 📋 TEMPLATE STANDARD POUR NOUVELLES TABLES

### 1. Structure de Table Requise

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

### 2. RLS Policies Standard

```sql
-- Activer RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- SELECT : Accès basé sur les associations
CREATE POLICY "new_table_select_universal" ON new_table
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

-- INSERT : Création basée sur les associations
CREATE POLICY "new_table_insert_universal" ON new_table
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            AND deleted = false
        )
    );

-- UPDATE : Modification basée sur les associations
CREATE POLICY "new_table_update_universal" ON new_table
    FOR UPDATE
    TO authenticated
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

-- DELETE : Suppression basée sur les associations
CREATE POLICY "new_table_delete_universal" ON new_table
    FOR DELETE
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

## 🗂️ TABLES EXISTANTES AVEC CETTE ARCHITECTURE

### ✅ Establishments

- `establishments_select_universal`
- `establishments_insert_universal`
- `establishments_update_universal`
- `establishments_delete_universal`

### ✅ Products

- `products_select_universal`
- `products_insert_universal`
- `products_update_universal`
- `products_delete_universal`

### ✅ Product Stocks

- `product_stocks_select_universal`
- `product_stocks_insert_universal`
- `product_stocks_update_universal`
- `product_stocks_delete_universal`

### ✅ Organizations

- `organizations_select_universal`
- `organizations_insert_universal`
- `organizations_update_universal`
- `organizations_delete_universal`

## 🚫 CE QU'IL NE FAUT PAS FAIRE

### ❌ Politiques Complexes

```sql
-- NE PAS FAIRE : Distinction par rôle dans RLS
CREATE POLICY "complex_policy" ON table_name
    FOR SELECT
    TO public  -- ❌ Jamais TO public
    USING (
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'system_admin'
        OR
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'org_admin'
        -- ❌ Trop complexe
    );
```

### ❌ Politiques Multiples

```sql
-- NE PAS FAIRE : Politiques séparées par rôle
CREATE POLICY "system_admin_select" ON table_name FOR SELECT TO authenticated USING (...);
CREATE POLICY "org_admin_select" ON table_name FOR SELECT TO authenticated USING (...);
CREATE POLICY "user_select" ON table_name FOR SELECT TO authenticated USING (...);
-- ❌ Trop de politiques
```

## 🔧 SCRIPT DE CORRECTION STANDARD

```sql
-- Template pour corriger une table
-- 1. Désactiver RLS
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "table_name_select" ON table_name;
DROP POLICY IF EXISTS "table_name_insert" ON table_name;
DROP POLICY IF EXISTS "table_name_update" ON table_name;
DROP POLICY IF EXISTS "table_name_delete" ON table_name;
-- ... supprimer toutes les autres

-- 3. Réactiver RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. Créer les politiques standard (voir template ci-dessus)
```

## 🎯 AVANTAGES DE CETTE APPROCHE

1. **Simplicité** : Une seule logique pour toutes les tables
2. **Cohérence** : Même comportement partout
3. **Maintenabilité** : Facile à comprendre et modifier
4. **Performance** : Politiques simples = meilleures performances
5. **Sécurité** : Basé sur `users_organizations` = isolation garantie

## 📝 NOTES IMPORTANTES

- **Rôles** : Gérés au niveau application, pas au niveau RLS
- **Isolation** : Chaque utilisateur ne voit que ses organisations
- **Flexibilité** : `system_admin` peut être associé à toutes les organisations via `users_organizations`
- **Évolutivité** : Facile d'ajouter de nouvelles tables avec le même pattern
