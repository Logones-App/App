-- Script pour créer les policies RLS pour la table mobile_user_permissions
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Supprimer toutes les policies existantes
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mobile_user_permissions') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON mobile_user_permissions;', r.policyname);
    END LOOP;
END $$;

-- 2. Redonner les droits GRANT nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mobile_user_permissions TO authenticated;

-- 3. Activer RLS
ALTER TABLE mobile_user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT universelle
CREATE POLICY "mobile_user_permissions_select_universal" ON mobile_user_permissions
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- 5. Policy INSERT universelle
CREATE POLICY "mobile_user_permissions_insert_universal" ON mobile_user_permissions
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- 6. Policy UPDATE universelle
CREATE POLICY "mobile_user_permissions_update_universal" ON mobile_user_permissions
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
)
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- 7. Policy DELETE universelle
CREATE POLICY "mobile_user_permissions_delete_universal" ON mobile_user_permissions
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
); 