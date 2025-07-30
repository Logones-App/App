-- Supprimer la policy SELECT publique (plus nécessaire avec Zustand)
DROP POLICY IF EXISTS "bookings_select_public" ON bookings;

-- Vérifier le résultat
SELECT
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname; 