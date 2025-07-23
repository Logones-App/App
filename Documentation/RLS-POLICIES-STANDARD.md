# 🔒 RLS POLICIES STANDARD - ARCHITECTURE SIMPLE

## 🎯 PRINCIPE FONDAMENTAL

**TOUTES les tables métiers utilisent la même architecture RLS universelle :**

- ✅ **TO authenticated** (jamais TO public sauf lecture publique explicite)
- ✅ **Basées uniquement sur `users_organizations`**
- ✅ **Aucune logique de rôle dans la RLS** (le rôle est géré côté application, jamais dans la policy SQL)
- ✅ **Même logique pour toutes les tables**
- ✅ **Une seule policy par action (SELECT, INSERT, UPDATE, DELETE)**

## 🚦 TEMPLATE STANDARD À UTILISER POUR TOUTE TABLE MÉTIER

```sql
-- 1. Supprimer toutes les policies existantes
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'table_name') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON table_name;', r.policyname);
    END LOOP;
END $$;

-- 2. Redonner les droits GRANT nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE table_name TO authenticated;

-- 3. Activer RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT universelle
CREATE POLICY "table_name_select_universal" ON table_name
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

-- 5. Policy INSERT universelle
CREATE POLICY "table_name_insert_universal" ON table_name
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

-- 6. Policy UPDATE universelle
CREATE POLICY "table_name_update_universal" ON table_name
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

-- 7. Policy DELETE universelle
CREATE POLICY "table_name_delete_universal" ON table_name
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);
```

## 🟢 EXPLICATIONS ET AVANTAGES

- **Aucune logique de rôle dans la RLS** : le rôle (system_admin, org_admin, user) est géré côté application, jamais dans la policy SQL.
- **Basé uniquement sur l’association dans `users_organizations`** : c’est la source de vérité multi-tenant.
- **Même logique pour toutes les actions** : SELECT, INSERT, UPDATE, DELETE.
- **Simplicité, sécurité, maintenabilité** : une seule policy par action, pas de duplication, pas de complexité inutile.
- **Compatible realtime et multi-organisation**.

## 🚫 CE QU'IL NE FAUT JAMAIS FAIRE

- ❌ **Ne jamais utiliser le champ `role` dans la RLS**
- ❌ **Ne jamais multiplier les policies par rôle**
- ❌ **Ne jamais faire de policies complexes ou imbriquées**
- ❌ **Ne jamais accorder TO public sauf pour lecture publique explicite**

## 📝 NOTES IMPORTANTES

- **Vérifier que l’utilisateur est bien associé à l’organisation dans `users_organizations`**
- **La colonne `organization_id` doit être présente et bien renseignée sur chaque ligne**
- **Le claim JWT `sub` doit correspondre à l’ID utilisateur**
- **Donner les droits GRANT nécessaires à `authenticated`**
- **Activer RLS sur la table**

---

**Ce template doit être utilisé pour toutes les tables métiers du projet.**

**Aucune logique de rôle dans la RLS, tout est basé sur l’association.**
