-- Script pour permettre l'insertion publique dans email_logs
-- Se concentre uniquement sur l'INSERT public comme demandé

-- 1. Désactiver RLS temporairement
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer l'ancienne politique d'insertion si elle existe
DROP POLICY IF EXISTS "email_logs_insert_policy" ON email_logs;

-- 3. Créer une politique d'insertion publique
CREATE POLICY "email_logs_insert_policy" ON email_logs
    FOR INSERT
    WITH CHECK (true); -- Permet l'insertion pour tous

-- 4. Réactiver RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

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
WHERE tablename = 'email_logs' AND policyname = 'email_logs_insert_policy'; 