-- ============================================================
-- 06 — SUPPRESSION DES RPCs STOCK
-- Ni le SaaS ni la mobile ne les utilisent.
-- Le SaaS gère les stocks via .update({current_stock}) direct.
-- ============================================================

DROP FUNCTION IF EXISTS public.add_stock_movement(uuid, uuid, character varying, numeric, character varying, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.reserve_stock(uuid, uuid, numeric, uuid, character varying);
DROP FUNCTION IF EXISTS public.unreserve_stock(uuid, uuid, numeric, uuid, character varying);
DROP FUNCTION IF EXISTS public.get_available_stock(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_stock_alerts(uuid);
