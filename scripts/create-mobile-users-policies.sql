-- Script pour créer les policies RLS pour la table mobile_users
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Supprimer toutes les policies existantes
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mobile_users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON mobile_users;', r.policyname);
    END LOOP;
END $$;

-- 2. Redonner les droits GRANT nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mobile_users TO authenticated;

-- 3. Activer RLS
ALTER TABLE mobile_users ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT universelle
CREATE POLICY "mobile_users_select_universal" ON mobile_users
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- 5. Policy INSERT universelle
CREATE POLICY "mobile_users_insert_universal" ON mobile_users
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- 6. Policy UPDATE universelle
CREATE POLICY "mobile_users_update_universal" ON mobile_users
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
CREATE POLICY "mobile_users_delete_universal" ON mobile_users
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Vérification des policies créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'mobile_users'
ORDER BY policyname; 