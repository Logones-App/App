-- Script pour supprimer et recréer la policy bookings_insert_public
-- Fichier: scripts/bookings-insert-policy-fix.sql

-- 1. Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "bookings_insert_public" ON "public"."bookings";

-- 2. Vérifier qu'elle est bien supprimée
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'bookings' AND policyname = 'bookings_insert_public';

-- 3. Créer la nouvelle policy d'insertion publique
CREATE POLICY "bookings_insert_public" ON "public"."bookings"
FOR INSERT TO public
WITH CHECK (true);

-- 4. Vérifier que la nouvelle policy est créée
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'bookings' AND policyname = 'bookings_insert_public';

-- 5. Lister toutes les policies sur bookings pour vérification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname; 