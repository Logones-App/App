-- ============================================================
-- 02 — UNIFICATION DES FONCTIONS TRIGGER updated_at
-- 9 fonctions font la même chose → on garde handle_updated_at()
-- et on rebranche tous les triggers existants dessus.
-- ============================================================

-- ÉTAPE 1 : S'assurer que handle_updated_at() est la fonction canonique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ÉTAPE 2 : Rebrancher les triggers qui pointaient vers les fonctions doublons
--           (on DROP + recreate pour pointer vers handle_updated_at)

-- order_suites : était sur handle_updated_at → déjà bon, rien à faire

-- booking_exceptions : était sur update_booking_exceptions_updated_at
DROP TRIGGER IF EXISTS trigger_update_booking_exceptions_updated_at ON public.booking_exceptions;
CREATE OR REPLACE TRIGGER trigger_update_booking_exceptions_updated_at
  BEFORE UPDATE ON public.booking_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- custom_domains : était sur update_updated_at_column
DROP TRIGGER IF EXISTS trigger_update_custom_domains_updated_at ON public.custom_domains;
CREATE OR REPLACE TRIGGER trigger_update_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- establishment_gallery : était sur update_establishment_gallery_updated_at
DROP TRIGGER IF EXISTS trigger_update_establishment_gallery_updated_at ON public.establishment_gallery;
CREATE OR REPLACE TRIGGER trigger_update_establishment_gallery_updated_at
  BEFORE UPDATE ON public.establishment_gallery
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- establishment_gallery_sections : était sur update_gallery_sections_updated_at
DROP TRIGGER IF EXISTS trigger_update_gallery_sections_updated_at ON public.establishment_gallery_sections;
CREATE OR REPLACE TRIGGER trigger_update_gallery_sections_updated_at
  BEFORE UPDATE ON public.establishment_gallery_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- order_products : était sur update_order_products_updated_at
DROP TRIGGER IF EXISTS trigger_order_products_updated_at ON public.order_products;
CREATE OR REPLACE TRIGGER trigger_order_products_updated_at
  BEFORE UPDATE ON public.order_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- profiles : était sur update_updated_at_column
DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE OR REPLACE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- users_organizations : était sur update_updated_at_column
DROP TRIGGER IF EXISTS trigger_update_users_organizations_updated_at ON public.users_organizations;
CREATE OR REPLACE TRIGGER trigger_update_users_organizations_updated_at
  BEFORE UPDATE ON public.users_organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- category_grid_items : était sur update_updated_at_column
DROP TRIGGER IF EXISTS update_category_grid_items_updated_at ON public.category_grid_items;
CREATE OR REPLACE TRIGGER update_category_grid_items_updated_at
  BEFORE UPDATE ON public.category_grid_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- email_logs : était sur update_email_logs_updated_at
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON public.email_logs;
CREATE OR REPLACE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- organizations : était sur update_updated_at_column
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE OR REPLACE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- product_stocks : était sur update_updated_at_column
DROP TRIGGER IF EXISTS update_product_stocks_updated_at ON public.product_stocks;
CREATE OR REPLACE TRIGGER update_product_stocks_updated_at
  BEFORE UPDATE ON public.product_stocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- work_sessions : était sur update_updated_at_column
DROP TRIGGER IF EXISTS update_work_sessions_updated_at ON public.work_sessions;
CREATE OR REPLACE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ÉTAPE 3 : Supprimer les 8 fonctions doublons devenues inutiles
-- CASCADE sur toutes car des triggers peuvent encore pointer vers elles ;
-- les triggers concernés sont tous recréés dans le script 03.
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_booking_exceptions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_custom_domains_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_email_logs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_establishment_gallery_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_gallery_sections_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_order_products_updated_at() CASCADE;
