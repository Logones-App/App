-- ============================================================
-- 01 — SUPPRESSION DES RPCs INUTILISÉS
-- Ni le SaaS ni la mobile n'appellent ces fonctions.
-- ============================================================

-- Conversions de temps (logique TS triviale)
DROP FUNCTION IF EXISTS public.slot_to_time(integer);
DROP FUNCTION IF EXISTS public.time_to_slot(time without time zone);
DROP FUNCTION IF EXISTS public.time_range_to_slots(time without time zone, time without time zone);
DROP FUNCTION IF EXISTS public.validate_closed_slots(integer[]);

-- Logique de créneaux (déjà implémentée en TypeScript dans le SaaS)
DROP FUNCTION IF EXISTS public.generate_15min_slots(text, text);
DROP FUNCTION IF EXISTS public.generate_slots_for_date(text, text);
DROP FUNCTION IF EXISTS public.get_available_slots_simple(text, text);
DROP FUNCTION IF EXISTS public.get_active_exceptions_for_date(text, text);
DROP FUNCTION IF EXISTS public.is_slot_closed_by_exception(text, integer, text, text);

-- Soft / hard delete (remplacé par .update({deleted:true}) / .delete() en app)
DROP FUNCTION IF EXISTS public.soft_delete_record(text, uuid);
DROP FUNCTION IF EXISTS public.soft_delete_establishment(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_product(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_order(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_organization(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_user(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_custom_domain(uuid);
DROP FUNCTION IF EXISTS public.hard_delete_record(text, uuid);
DROP FUNCTION IF EXISTS public.restore_deleted_record(text, uuid);

-- Requêtes simples (faisables avec .select() en app)
DROP FUNCTION IF EXISTS public.get_current_organization_id();
DROP FUNCTION IF EXISTS public.get_user_organization(uuid);
DROP FUNCTION IF EXISTS public.get_gallery_image_url(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_menu_products(uuid);
DROP FUNCTION IF EXISTS public.get_establishment_gallery_images(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_establishment_gallery_section_images(uuid, text);
DROP FUNCTION IF EXISTS public.get_active_menus_by_time(uuid, uuid, time without time zone);

-- Debug
DROP FUNCTION IF EXISTS public.test_auth_uid();
