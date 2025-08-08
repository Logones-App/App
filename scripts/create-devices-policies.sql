-- Script pour créer les policies RLS pour la table devices
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Supprimer toutes les policies existantes
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'devices') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON devices;', r.policyname);
    END LOOP;
END $$;

-- 2. Redonner les droits GRANT nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE devices TO authenticated;

-- 3. Activer RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT universelle
CREATE POLICY "devices_select_universal" ON devices
FOR SELECT TO authenticated
USING (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    INNER JOIN users_organizations ON establishments.organization_id = users_organizations.organization_id
    WHERE users_organizations.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
    AND users_organizations.deleted = false
    AND establishments.deleted = false
  )
);

-- 5. Policy INSERT universelle
CREATE POLICY "devices_insert_universal" ON devices
FOR INSERT TO authenticated
WITH CHECK (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    INNER JOIN users_organizations ON establishments.organization_id = users_organizations.organization_id
    WHERE users_organizations.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
    AND users_organizations.deleted = false
    AND establishments.deleted = false
  )
);

-- 6. Policy UPDATE universelle
CREATE POLICY "devices_update_universal" ON devices
FOR UPDATE TO authenticated
USING (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    INNER JOIN users_organizations ON establishments.organization_id = users_organizations.organization_id
    WHERE users_organizations.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
    AND users_organizations.deleted = false
    AND establishments.deleted = false
  )
)
WITH CHECK (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    INNER JOIN users_organizations ON establishments.organization_id = users_organizations.organization_id
    WHERE users_organizations.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
    AND users_organizations.deleted = false
    AND establishments.deleted = false
  )
);

-- 7. Policy DELETE universelle
CREATE POLICY "devices_delete_universal" ON devices
FOR DELETE TO authenticated
USING (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    INNER JOIN users_organizations ON establishments.organization_id = users_organizations.organization_id
    WHERE users_organizations.user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
    AND users_organizations.deleted = false
    AND establishments.deleted = false
  )
); 