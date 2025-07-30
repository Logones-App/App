-- 🔒 SCRIPT POUR SUPPRIMER LES COLONNES TOKEN OBSOLÈTES
-- Supprime les colonnes confirmation_token et token_expires_at de la table bookings

-- 1. Supprimer la colonne confirmation_token
ALTER TABLE bookings DROP COLUMN IF EXISTS confirmation_token;

-- 2. Supprimer la colonne token_expires_at
ALTER TABLE bookings DROP COLUMN IF EXISTS token_expires_at;

-- 3. Vérifier que les colonnes ont été supprimées
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position; 