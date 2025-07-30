-- 🔒 SCRIPT RLS POUR BOOKINGS_INSERT_UNIVERSAL
-- Respecte le pattern standard de la documentation

-- 1. Supprimer la policy existante si elle existe
DROP POLICY IF EXISTS "bookings_insert_universal" ON bookings;

-- 2. S'assurer que les droits GRANT sont corrects
GRANT INSERT ON TABLE bookings TO authenticated;

-- 3. Activer RLS si pas déjà activé
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 4. Créer la policy INSERT universelle
CREATE POLICY "bookings_insert_universal" ON bookings
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

-- 5. Vérifier que la policy a été créée
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'bookings' 
  AND policyname = 'bookings_insert_universal'
ORDER BY policyname; 