-- =============================================================
-- FK created_by → auth.users(id) ON DELETE SET NULL
-- 26 tables sans contrainte FK sur created_by
-- Date : 2026-06-13
-- =============================================================
-- Étape 1 : NULLifier les created_by orphelins (UUID absent de auth.users)
-- Étape 2 : Ajouter les contraintes FK
-- =============================================================


-- =============================================================
-- ÉTAPE 1 — Nettoyage des orphelins
-- =============================================================

UPDATE public.booking_exceptions        SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.booking_slots             SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.bookings                  SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.categories                SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.custom_domains            SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.daily_found               SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.email_logs                SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.establishment_gallery     SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.establishments            SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.menus                     SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.menus_products            SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.menus_products_price_history SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.messages                  SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.order_payment_settlements SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.order_payments            SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.order_payments_rows       SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.orders                    SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.printers                  SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.product_purchase_price_history SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.product_stocks            SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.products                  SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.rooms                     SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.stock_movements           SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.tables                    SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.tables_connections        SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);
UPDATE public.vat_rate                  SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);


-- =============================================================
-- ÉTAPE 2 — Ajout des contraintes FK
-- =============================================================

ALTER TABLE public.booking_exceptions
  ADD CONSTRAINT booking_exceptions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.booking_slots
  ADD CONSTRAINT booking_slots_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.custom_domains
  ADD CONSTRAINT custom_domains_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.daily_found
  ADD CONSTRAINT daily_found_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.establishment_gallery
  ADD CONSTRAINT establishment_gallery_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.establishments
  ADD CONSTRAINT establishments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.menus
  ADD CONSTRAINT menus_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.menus_products
  ADD CONSTRAINT menus_products_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.menus_products_price_history
  ADD CONSTRAINT menus_products_price_history_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_payment_settlements
  ADD CONSTRAINT order_payment_settlements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_payments_rows
  ADD CONSTRAINT order_payments_rows_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.printers
  ADD CONSTRAINT printers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.product_purchase_price_history
  ADD CONSTRAINT product_purchase_price_history_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.product_stocks
  ADD CONSTRAINT product_stocks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tables
  ADD CONSTRAINT tables_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tables_connections
  ADD CONSTRAINT tables_connections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vat_rate
  ADD CONSTRAINT vat_rate_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- =============================================================
-- VÉRIFICATION (optionnel — lancer séparément)
-- =============================================================
-- SELECT conname, conrelid::regclass AS table_name
-- FROM pg_constraint
-- WHERE conname LIKE '%_created_by_fkey'
-- ORDER BY table_name;
