-- Script pour diagnostiquer et corriger l'INSERT anon sur bookings
-- Fichier: scripts/bookings-anon-insert-fix.sql

-- 1. Vérifier l'état actuel de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'bookings';

-- 2. Lister toutes les policies existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 3. Supprimer et recréer la policy anon INSERT
DROP POLICY IF EXISTS "bookings_insert_public" ON "public"."bookings";

-- 4. Créer une policy plus permissive pour l'anon key
CREATE POLICY "bookings_insert_anon" ON "public"."bookings"
FOR INSERT TO anon
WITH CHECK (true);

-- 5. Vérifier que la nouvelle policy est créée
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'bookings' AND policyname = 'bookings_insert_anon';

-- 6. Lister toutes les policies pour confirmation
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