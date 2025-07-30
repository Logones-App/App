-- Script pour lister les politiques RLS de la table email_logs

-- Lister toutes les politiques de la table email_logs
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
WHERE tablename = 'email_logs'
ORDER BY policyname;

-- Afficher le nombre total de politiques
SELECT 
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE tablename = 'email_logs';

-- Vérifier si RLS est activé sur la table email_logs
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'email_logs';

-- Lister spécifiquement les politiques d'insertion
SELECT 
    policyname,
    roles,
    with_check
FROM pg_policies 
WHERE tablename = 'email_logs' AND cmd = 'INSERT'; 