-- Script pour sécuriser les policies de bookings existantes

-- 1. Ajouter les colonnes de sécurité
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- 2. Supprimer l'ancienne policy SELECT publique (trop permissive)
DROP POLICY IF EXISTS "bookings_select_public" ON bookings;

-- 3. Créer une nouvelle policy SELECT sécurisée
CREATE POLICY "bookings_select_public" ON "public"."bookings"
FOR SELECT TO public
USING (
  confirmation_token IS NOT NULL 
  AND token_expires_at > NOW()
  AND status = 'confirmed'
);

-- 4. Vérification des policies
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY policyname; 