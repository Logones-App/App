-- ============================================================
-- 04 — SUPPRESSION DES FONCTIONS TRIGGER ORPHELINES
-- Définies mais jamais attachées à un trigger.
-- À exécuter APRÈS les scripts 02 et 03.
-- ============================================================

-- Doublon de handle_times, jamais utilisée
DROP FUNCTION IF EXISTS public.handle_products_categories_times();

-- Définie mais jamais attachée à un trigger
DROP FUNCTION IF EXISTS public.sync_establishment_slug();

-- Définie mais aucun trigger ne l'utilise (custom_domains utilise handle_updated_at après script 02)
-- Note : update_custom_domains_updated_at a déjà été supprimée dans le script 02
-- (incluse ici en sécurité avec IF EXISTS)
DROP FUNCTION IF EXISTS public.update_custom_domains_updated_at();

-- Définie mais jamais attachée à un trigger
DROP FUNCTION IF EXISTS public.validate_domain_format();

-- NOTE sur handle_new_user() :
-- Cette fonction est probablement attachée sur auth.users (schema non visible dans le dump).
-- NE PAS la supprimer sans vérifier dans Supabase Dashboard → Database → Triggers
-- qu'il n'y a pas de trigger sur auth.users qui l'appelle.
