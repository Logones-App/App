-- ============================================================
-- 05 — AJOUT DES TRIGGERS updated_at MANQUANTS
-- 21 tables ont une colonne updated_at mais aucun trigger.
-- Toutes pointent vers handle_updated_at() (script 02).
-- À exécuter APRÈS le script 02.
-- ============================================================

-- actions
CREATE OR REPLACE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- bookings
CREATE OR REPLACE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- booking_slots
CREATE OR REPLACE TRIGGER update_booking_slots_updated_at
  BEFORE UPDATE ON public.booking_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- booking_table_allocations
CREATE OR REPLACE TRIGGER update_booking_table_allocations_updated_at
  BEFORE UPDATE ON public.booking_table_allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- cash_withdrawals
CREATE OR REPLACE TRIGGER update_cash_withdrawals_updated_at
  BEFORE UPDATE ON public.cash_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- devices
CREATE OR REPLACE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- formula_products
CREATE OR REPLACE TRIGGER update_formula_products_updated_at
  BEFORE UPDATE ON public.formula_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- formula_slots
CREATE OR REPLACE TRIGGER update_formula_slots_updated_at
  BEFORE UPDATE ON public.formula_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- menu_schedules
CREATE OR REPLACE TRIGGER update_menu_schedules_updated_at
  BEFORE UPDATE ON public.menu_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- mobile_user_permissions
CREATE OR REPLACE TRIGGER update_mobile_user_permissions_updated_at
  BEFORE UPDATE ON public.mobile_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- mobile_users
CREATE OR REPLACE TRIGGER update_mobile_users_updated_at
  BEFORE UPDATE ON public.mobile_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- order_formulas
CREATE OR REPLACE TRIGGER update_order_formulas_updated_at
  BEFORE UPDATE ON public.order_formulas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- order_payment_settlements
CREATE OR REPLACE TRIGGER update_order_payment_settlements_updated_at
  BEFORE UPDATE ON public.order_payment_settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- order_refunds
CREATE OR REPLACE TRIGGER update_order_refunds_updated_at
  BEFORE UPDATE ON public.order_refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- payment_methods
CREATE OR REPLACE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- product_compositions
CREATE OR REPLACE TRIGGER update_product_compositions_updated_at
  BEFORE UPDATE ON public.product_compositions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- product_options
CREATE OR REPLACE TRIGGER update_product_options_updated_at
  BEFORE UPDATE ON public.product_options
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- nf525_config
CREATE OR REPLACE TRIGGER update_nf525_config_updated_at
  BEFORE UPDATE ON public.nf525_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- nf525_restitutions
CREATE OR REPLACE TRIGGER update_nf525_restitutions_updated_at
  BEFORE UPDATE ON public.nf525_restitutions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- nf525_sequences
CREATE OR REPLACE TRIGGER update_nf525_sequences_updated_at
  BEFORE UPDATE ON public.nf525_sequences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- nf525_signing_keys
CREATE OR REPLACE TRIGGER update_nf525_signing_keys_updated_at
  BEFORE UPDATE ON public.nf525_signing_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
