-- ============================================================
-- 03 — SUPPRESSION DES TRIGGERS DOUBLONS
-- Plusieurs tables ont 2-3 triggers qui font la même chose.
-- On garde un seul trigger par table, pointant vers handle_updated_at().
-- À exécuter APRÈS le script 02.
-- ============================================================

-- TABLE : menus (3 triggers → 1)
-- Garder : handle_order_suites_updated_at pattern → on garde set_updated_at_trigger renommé
-- On supprime les doublons, on recrée proprement un seul
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.menus;
DROP TRIGGER IF EXISTS trigger_update_menus_updated_at ON public.menus;
DROP TRIGGER IF EXISTS update_menus_updated_at ON public.menus;
CREATE OR REPLACE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TABLE : menus_products (2 triggers → 1)
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.menus_products;
DROP TRIGGER IF EXISTS trigger_update_menus_products_updated_at ON public.menus_products;
CREATE OR REPLACE TRIGGER update_menus_products_updated_at
  BEFORE UPDATE ON public.menus_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TABLE : establishments (2 triggers → 1)
-- set_updated_at_trigger pointait vers set_updated_at() (maintenant supprimée)
-- update_establishments_updated_at pointait vers update_updated_at_column() (maintenant supprimée)
-- Le script 02 a déjà rebranche update_organizations vers handle_updated_at
-- On nettoie les anciens et on crée le trigger canonique
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.establishments;
DROP TRIGGER IF EXISTS update_establishments_updated_at ON public.establishments;
CREATE OR REPLACE TRIGGER update_establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TABLE : opening_hours (2 triggers → 1)
-- handle_opening_hours_times pointait vers handle_times() (gère created_at ET updated_at sur INSERT/UPDATE)
-- trigger_update_opening_hours_updated_at pointait vers update_updated_at_column()
-- On garde handle_times car il gère aussi created_at, on supprime le doublon
DROP TRIGGER IF EXISTS trigger_update_opening_hours_updated_at ON public.opening_hours;

-- TABLE : opening_hours_exceptions (2 triggers → 1)
DROP TRIGGER IF EXISTS trigger_update_opening_hours_exceptions_updated_at ON public.opening_hours_exceptions;

-- TABLE : messages (2 triggers → 1)
-- handle_times gère INSERT+UPDATE (created_at + updated_at) → on garde
-- trigger_update_messages_updated_at était un doublon UPDATE only
DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON public.messages;
