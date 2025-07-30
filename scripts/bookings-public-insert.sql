-- Script pour permettre l'insertion publique dans bookings
-- Se concentre uniquement sur l'INSERT public pour les réservations publiques

-- 1. Désactiver RLS temporairement
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer l'ancienne politique d'insertion si elle existe
DROP POLICY IF EXISTS "bookings_insert_universal" ON bookings;

-- 3. Créer une politique d'insertion publique
CREATE POLICY "bookings_insert_public" ON bookings
    FOR INSERT
    WITH CHECK (true); -- Permet l'insertion pour tous

-- 4. Réactiver RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que la politique est créée
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
WHERE tablename = 'bookings' AND policyname = 'bookings_insert_public'; 