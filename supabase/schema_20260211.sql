

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."TodosWithChildren" AS ENUM (
    'todos',
    'todos1'
);


ALTER TYPE "public"."TodosWithChildren" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_stock_movement"("p_product_id" "uuid", "p_organization_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying DEFAULT NULL::character varying, "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text", "p_work_session_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_movement_id UUID;
BEGIN
    INSERT INTO stock_movements (
        product_id,
        organization_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        work_session_id,
        created_by
    ) VALUES (
        p_product_id,
        p_organization_id,
        p_movement_type,
        p_quantity,
        p_reference_type,
        p_reference_id,
        p_notes,
        p_work_session_id,
        auth.uid()
    ) RETURNING id INTO v_movement_id;
    
    RETURN v_movement_id;
END;
$$;


ALTER FUNCTION "public"."add_stock_movement"("p_product_id" "uuid", "p_organization_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_notes" "text", "p_work_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_stock_quantities"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SELECT ps.current_stock INTO NEW.quantity_before
  FROM public.product_stocks ps
  INNER JOIN public.product_compositions pc ON pc.id = ps.product_composition_id
  WHERE pc.component_product_id = NEW.product_id
    AND ps.organization_id = NEW.organization_id
  ORDER BY ps.created_at NULLS LAST
  LIMIT 1;

  NEW.quantity_after := COALESCE(NEW.quantity_before, 0) + NEW.quantity;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_stock_quantities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_device_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE "public"."device_sessions" 
  SET "is_active" = false 
  WHERE "expires_at" IS NOT NULL 
    AND "expires_at" < "now"() 
    AND "is_active" = true;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_device_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Supprimer les créneaux de plus de 7 jours non consultés
  DELETE FROM available_slots_cache 
  WHERE last_accessed_at < NOW() - INTERVAL '7 days'
    AND date < CURRENT_DATE;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Supprimer les créneaux de plus de 30 jours (même consultés)
  DELETE FROM available_slots_cache 
  WHERE date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_cache"() IS 'Nettoie automatiquement l''ancien cache';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_logs 
    WHERE created_at < (NOW() - (days_to_keep || ' days')::INTERVAL)
    AND status IN ('sent', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) IS 'Fonction pour nettoyer les anciens logs d''emails';



CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_gallery_images"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Supprimer les images qui n'ont plus d'établissement associé
  DELETE FROM storage.objects 
  WHERE bucket_id = 'gallery' 
    AND NOT EXISTS (
      SELECT 1 FROM establishments e 
      WHERE e.id::text = (storage.foldername(name))[2]
        AND e.organization_id::text = (storage.foldername(name))[1]
        AND e.deleted = false
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphaned_gallery_images"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_payment_methods_for_establishment"("p_establishment_id" "uuid", "p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Carte (type stable 'card')
  INSERT INTO payment_methods (
    establishment_id,
    organization_id,
    payment_method_name,
    payment_method_type,
    deleted,
    is_active
  )
  SELECT p_establishment_id, p_organization_id, 'Carte', 'card', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods
    WHERE establishment_id = p_establishment_id
      AND payment_method_type = 'card'
      AND deleted = false
  );

  -- Espèces (type stable 'cash')
  INSERT INTO payment_methods (
    establishment_id,
    organization_id,
    payment_method_name,
    payment_method_type,
    deleted,
    is_active
  )
  SELECT p_establishment_id, p_organization_id, 'Espèces', 'cash', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods
    WHERE establishment_id = p_establishment_id
      AND payment_method_type = 'cash'
      AND deleted = false
  );
END;
$$;


ALTER FUNCTION "public"."create_default_payment_methods_for_establishment"("p_establishment_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_booking_slots_org_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (
    SELECT e.organization_id FROM public.establishments e WHERE e.id = NEW.establishment_id
  ) THEN
    RAISE EXCEPTION 'booking_slots.organization_id doit correspondre à establishments.organization_id';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_booking_slots_org_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_self_product_composition"("p_product_id" "uuid", "p_establishment_id" "uuid", "p_organization_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT pc.id INTO v_id
  FROM public.product_compositions pc
  WHERE pc.establishment_id = p_establishment_id
    AND pc.organization_id = p_organization_id
    AND pc.main_product_id = p_product_id
    AND pc.component_product_id = p_product_id
    AND COALESCE(pc.deleted, false) = false
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.product_compositions (
    id,
    main_product_id,
    component_product_id,
    establishment_id,
    organization_id,
    deleted,
    default_quantity,
    is_required,
    display_order,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_product_id,
    p_product_id,
    p_establishment_id,
    p_organization_id,
    false,
    1,
    true,
    0,
    now(),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."ensure_self_product_composition"("p_product_id" "uuid", "p_establishment_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_15min_slots"("p_establishment_id" "uuid", "p_date" "date") RETURNS TABLE("slot_time" time without time zone, "service_name" "text", "is_available" boolean, "available_capacity" integer, "max_capacity" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_day_of_week INTEGER;
    v_slot_time TIME;
    v_service_name TEXT;
    v_is_available BOOLEAN;
    v_max_capacity INTEGER := 20; -- Capacité par défaut
BEGIN
    -- Récupérer le jour de la semaine (0 = Dimanche, 1 = Lundi, etc.)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Générer les créneaux de 15 minutes pour les horaires d'ouverture
    FOR v_slot_time IN 
        SELECT generate_series(
            '11:00'::TIME, 
            '13:45'::TIME, 
            '15 minutes'::INTERVAL
        )::TIME
        UNION
        SELECT generate_series(
            '18:00'::TIME, 
            '21:45'::TIME, 
            '15 minutes'::INTERVAL
        )::TIME
    LOOP
        -- Déterminer le service selon l'heure
        IF v_slot_time >= '11:00'::TIME AND v_slot_time < '14:00'::TIME THEN
            v_service_name := 'Déjeuner';
        ELSIF v_slot_time >= '18:00'::TIME AND v_slot_time < '22:00'::TIME THEN
            v_service_name := 'Dîner';
        ELSE
            v_service_name := 'Service standard';
        END IF;
        
        -- Vérifier si le créneau est ouvert selon les horaires d'ouverture
        SELECT EXISTS(
            SELECT 1 FROM opening_hours
            WHERE establishment_id = p_establishment_id
            AND day_of_week = v_day_of_week
            AND name = v_service_name
            AND is_active = true
            AND v_slot_time >= open_time
            AND v_slot_time < close_time
            AND (valid_from IS NULL OR valid_from <= p_date)
            AND (valid_until IS NULL OR valid_until >= p_date)
        ) INTO v_is_available;
        
        -- Retourner le créneau
        RETURN QUERY SELECT 
            v_slot_time,
            v_service_name,
            v_is_available,
            CASE WHEN v_is_available THEN v_max_capacity ELSE 0 END,
            v_max_capacity;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_15min_slots"("p_establishment_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_slots_for_date"("p_establishment_id" "uuid", "p_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  loop_time TIME;
  oh RECORD;
BEGIN
  -- Supprimer les anciens créneaux pour cette date (si ils existent)
  DELETE FROM available_slots_cache 
  WHERE establishment_id = p_establishment_id 
    AND date = p_date;
  
  -- Récupérer les horaires d'ouverture pour ce jour
  FOR oh IN 
    SELECT * FROM opening_hours 
    WHERE establishment_id = p_establishment_id 
    AND day_of_week = EXTRACT(DOW FROM p_date)
    AND is_active = true
    AND (valid_until IS NULL OR valid_until >= p_date)
    AND valid_from <= p_date
  LOOP
    
    -- Générer les créneaux de 15 minutes
    loop_time := oh.open_time;
    WHILE loop_time < oh.close_time LOOP
      
      -- Insérer le créneau
      INSERT INTO available_slots_cache (
        establishment_id, date, time, service_name, 
        is_available, max_capacity, current_bookings
      ) VALUES (
        p_establishment_id, p_date, loop_time, 
        COALESCE(oh.name, 'Service'), true, 10, 0
      );
      
      -- Passer au créneau suivant (15 minutes)
      loop_time := loop_time + INTERVAL '15 minutes';
    END LOOP;
    
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_slots_for_date"("p_establishment_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_exceptions_for_date"("p_establishment_id" "uuid", "p_date" "date") RETURNS TABLE("id" "uuid", "exception_type" "text", "booking_slot_id" "uuid", "closed_slots" integer[], "reason" "text", "description" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        be.id,
        be.exception_type,
        be.booking_slot_id,
        be.closed_slots,
        be.reason,
        be.description
    FROM booking_exceptions be
    WHERE be.establishment_id = p_establishment_id
      AND be.deleted = FALSE
      AND be.status = 'active'
      AND (
          -- Exception de période
          (be.exception_type = 'period' AND p_date BETWEEN be.start_date AND be.end_date) OR
          -- Exception de jour unique
          (be.exception_type = 'single_day' AND be.date = p_date) OR
          -- Exception de service (valide pour tous les jours)
          (be.exception_type = 'service') OR
          -- Exception de créneaux spécifiques
          (be.exception_type = 'time_slots' AND be.date = p_date)
      );
END;
$$;


ALTER FUNCTION "public"."get_active_exceptions_for_date"("p_establishment_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_menus_by_time"("p_organization_id" "uuid", "p_current_time" time without time zone DEFAULT CURRENT_TIME, "p_establishment_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("menu_id" "uuid", "menu_name" "text", "menu_description" "text", "menu_type" character varying, "start_time" time without time zone, "end_time" time without time zone, "is_public" boolean, "display_order" integer, "image_url" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.description,
        m.type,
        m.start_time,
        m.end_time,
        m.is_public,
        m.display_order,
        m.image_url
    FROM menus m
    WHERE m.deleted IS NULL 
    AND m.is_active = true
    AND m.organization_id = p_organization_id
    AND (p_establishment_id IS NULL OR m.establishments_id = p_establishment_id)
    AND (
        m.start_time IS NULL 
        OR m.end_time IS NULL 
        OR (p_current_time >= m.start_time AND p_current_time <= m.end_time)
    )
    ORDER BY m.display_order, m.name;
END;
$$;


ALTER FUNCTION "public"."get_active_menus_by_time"("p_organization_id" "uuid", "p_current_time" time without time zone, "p_establishment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_slots_simple"("p_establishment_id" "uuid", "p_date" "date") RETURNS TABLE("slot_id" "uuid", "start_time" time without time zone, "end_time" time without time zone, "is_available" boolean, "establishment_id" "uuid", "date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH time_slots AS (
        SELECT 
            (generate_series(0, 17, 1) * 30)::integer as minutes_from_start
    ),
    generated_slots AS (
        SELECT 
            gen_random_uuid() as slot_id,
            ('09:00'::time + (minutes_from_start || ' minutes')::interval)::time as start_time,
            ('09:00'::time + ((minutes_from_start + 30) || ' minutes')::interval)::time as end_time,
            true as is_available,
            p_establishment_id as establishment_id,
            p_date as date
        FROM time_slots
        WHERE minutes_from_start >= 0 
        AND minutes_from_start < 540  -- 18h - 9h = 9h = 540 minutes
    )
    SELECT 
        gs.slot_id,
        gs.start_time,
        gs.end_time,
        gs.is_available,
        gs.establishment_id,
        gs.date
    FROM generated_slots gs
    WHERE EXISTS (
        SELECT 1 
        FROM establishments e 
        WHERE e.id = p_establishment_id 
        AND e.is_public = true 
        AND e.deleted = false
    )
    ORDER BY gs.start_time;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_available_slots_simple"("p_establishment_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_stock"("p_product_id" "uuid", "p_organization_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_available_stock numeric;
BEGIN
  SELECT COALESCE(SUM(ps.current_stock - ps.reserved_stock), 0)
  INTO v_available_stock
  FROM public.product_stocks ps
  INNER JOIN public.product_compositions pc ON pc.id = ps.product_composition_id
  WHERE pc.component_product_id = p_product_id
    AND ps.organization_id = p_organization_id
    AND COALESCE(ps.deleted, false) = false;

  RETURN COALESCE(v_available_stock, 0);
END;
$$;


ALTER FUNCTION "public"."get_available_stock"("p_product_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_organization_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM users_organizations 
    WHERE user_id = auth.uid() AND deleted = FALSE
    ORDER BY created_at ASC 
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "public"."get_current_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_establishment_gallery_images"("p_establishment_id" "uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "image_url" "text", "image_name" character varying, "image_description" "text", "alt_text" character varying, "file_size" integer, "mime_type" character varying, "dimensions" "jsonb", "display_order" integer, "is_public" boolean, "is_featured" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eg.id,
    eg.image_url,
    eg.image_name,
    eg.image_description,
    eg.alt_text,
    eg.file_size,
    eg.mime_type,
    eg.dimensions,
    eg.display_order,
    eg.is_public,
    eg.is_featured,
    eg.created_at
  FROM establishment_gallery eg
  WHERE eg.establishment_id = p_establishment_id
    AND eg.deleted = false
    AND (p_organization_id IS NULL OR eg.organization_id = p_organization_id)
  ORDER BY eg.display_order ASC, eg.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_establishment_gallery_images"("p_establishment_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_establishment_gallery_section_images"("p_establishment_id" "uuid", "p_section" character varying) RETURNS TABLE("id" "uuid", "establishment_id" "uuid", "organization_id" "uuid", "image_id" "uuid", "section" character varying, "display_order" integer, "image_url" "text", "image_name" character varying, "image_description" "text", "alt_text" character varying, "file_size" integer, "mime_type" character varying, "dimensions" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id,
    gs.establishment_id,
    gs.organization_id,
    gs.image_id,
    gs.section,
    gs.display_order,
    g.image_url,
    g.image_name,
    g.image_description,
    g.alt_text,
    g.file_size,
    g.mime_type,
    g.dimensions,
    gs.created_at,
    gs.updated_at
  FROM establishment_gallery_sections gs
  INNER JOIN establishment_gallery g ON g.id = gs.image_id
  WHERE gs.establishment_id = p_establishment_id
    AND gs.section = p_section
    AND gs.deleted = false
    AND g.deleted = false
  ORDER BY gs.display_order ASC, gs.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_establishment_gallery_section_images"("p_establishment_id" "uuid", "p_section" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gallery_image_url"("p_organization_id" "uuid", "p_establishment_id" "uuid", "p_image_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN storage.url('gallery', p_organization_id::text || '/' || p_establishment_id::text || '/' || p_image_name);
END;
$$;


ALTER FUNCTION "public"."get_gallery_image_url"("p_organization_id" "uuid", "p_establishment_id" "uuid", "p_image_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_menu_products"("p_menu_id" "uuid") RETURNS TABLE("product_id" "uuid", "product_name" "text", "product_description" "text", "menu_price" numeric, "product_base_price" numeric, "vat_rate" numeric, "category_id" "uuid", "category_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        mp.price,
        p.price,
        p.vat_rate,
        pc.category_id,
        c.name as category_name
    FROM menus_products mp
    JOIN products p ON mp.products_id = p.id AND p.deleted IS NULL
    LEFT JOIN products_categories pc ON p.id = pc.product_id AND pc.deleted IS NULL
    LEFT JOIN categories c ON pc.category_id = c.id AND c.deleted IS NULL
    WHERE mp.menus_id = p_menu_id 
    AND mp.deleted IS NULL
    ORDER BY c.name, p.name;
END;
$$;


ALTER FUNCTION "public"."get_menu_products"("p_menu_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_next bigint;
BEGIN
  IF p_piece_type IS NULL OR p_piece_type NOT IN ('ticket', 'note', 'justificatif') THEN
    RAISE EXCEPTION 'piece_type doit être ticket, note ou justificatif';
  END IF;

  INSERT INTO nf525_sequences (establishment_id, device_id, piece_type, organization_id, last_number)
  VALUES (p_establishment_id, p_device_id, p_piece_type, p_organization_id, 1)
  ON CONFLICT (establishment_id, device_id, piece_type)
  DO UPDATE SET
    last_number = nf525_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;


ALTER FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid") IS 'NF525 R13 : retourne le prochain numéro de pièce (ticket/note/justificatif) pour establishment+device et incrémente la séquence.';



CREATE OR REPLACE FUNCTION "public"."get_stock_alerts"("p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("product_id" "uuid", "product_name" "text", "current_stock" numeric, "min_stock" numeric, "unit" character varying, "alert_level" character varying, "alert_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.product_id,
        sa.product_name,
        sa.current_stock,
        sa.min_stock,
        sa.unit,
        sa.alert_level,
        sa.alert_message
    FROM stock_alerts_view sa
    WHERE (p_organization_id IS NULL OR sa.organization_id = p_organization_id)
    ORDER BY 
        CASE sa.alert_level 
            WHEN 'critical' THEN 1 
            WHEN 'low' THEN 2 
            ELSE 3 
        END,
        sa.current_stock ASC;
END;
$$;


ALTER FUNCTION "public"."get_stock_alerts"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization"("user_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM users_organizations
  WHERE user_id = user_uuid
    AND deleted = false
  LIMIT 1;
  
  RETURN org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organization"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_products_categories_times"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_at := now();
        NEW.updated_at := now();
    ELSIF (TG_OP = 'UPDATE') THEN
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_products_categories_times"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_times"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_at := now();
        NEW.updated_at := now();
    ELSEIF (TG_OP = 'UPDATE') THEN
        NEW.created_at = OLD.created_at;
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."handle_times"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hard_delete_record"("table_name" "text", "record_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    sql_query TEXT;
    result BOOLEAN;
BEGIN
    -- Construire la requête SQL dynamiquement
    sql_query := format('DELETE FROM %I WHERE id = $1', table_name);
    
    -- Exécuter la requête
    EXECUTE sql_query USING record_id;
    
    -- Vérifier si une ligne a été affectée
    GET DIAGNOSTICS result = ROW_COUNT;
    
    RETURN result > 0;
END;
$_$;


ALTER FUNCTION "public"."hard_delete_record"("table_name" "text", "record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_slot_closed_by_exception"("p_establishment_id" "uuid", "p_date" "date", "p_slot_number" integer, "p_booking_slot_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    exception_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO exception_count
    FROM booking_exceptions
    WHERE establishment_id = p_establishment_id
      AND deleted = FALSE
      AND status = 'active'
      AND (
          -- Exception de période
          (exception_type = 'period' AND p_date BETWEEN start_date AND end_date) OR
          -- Exception de jour unique
          (exception_type = 'single_day' AND date = p_date) OR
          -- Exception de service
          (exception_type = 'service' AND booking_slot_id = p_booking_slot_id) OR
          -- Exception de créneaux spécifiques
          (exception_type = 'time_slots' AND date = p_date AND p_slot_number = ANY(closed_slots))
      );
    
    RETURN exception_count > 0;
END;
$$;


ALTER FUNCTION "public"."is_slot_closed_by_exception"("p_establishment_id" "uuid", "p_date" "date", "p_slot_number" integer, "p_booking_slot_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_num bigint;
BEGIN
  v_num := GREATEST(1, COALESCE(NULLIF(trim(NEW.piece_number), '')::bigint, 0));

  INSERT INTO nf525_sequences (establishment_id, device_id, piece_type, organization_id, last_number)
  VALUES (NEW.establishment_id, NEW.device_id, NEW.piece_type, NEW.organization_id, v_num)
  ON CONFLICT (establishment_id, device_id, piece_type)
  DO UPDATE SET
    last_number = GREATEST(nf525_sequences.last_number, v_num),
    updated_at = now();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() IS 'Met à jour nf525_sequences (last_number) à l’insert d’une pièce ; permet numérotation 100 % locale en app.';



CREATE OR REPLACE FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer DEFAULT 100, "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("range_start" bigint, "range_end" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_last bigint;
  v_new_last bigint;
BEGIN
  IF p_piece_type IS NULL OR p_piece_type NOT IN ('ticket', 'note', 'justificatif') THEN
    RAISE EXCEPTION 'piece_type doit être ticket, note ou justificatif';
  END IF;
  IF p_count IS NULL OR p_count < 1 OR p_count > 1000 THEN
    RAISE EXCEPTION 'p_count doit être entre 1 et 1000';
  END IF;

  INSERT INTO nf525_sequences (establishment_id, device_id, piece_type, organization_id, last_number)
  VALUES (p_establishment_id, p_device_id, p_piece_type, p_organization_id, p_count)
  ON CONFLICT (establishment_id, device_id, piece_type)
  DO UPDATE SET
    last_number = nf525_sequences.last_number + p_count,
    updated_at = now()
  RETURNING last_number INTO v_new_last;

  range_start := v_new_last - p_count + 1;
  range_end   := v_new_last;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer, "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer, "p_organization_id" "uuid") IS 'NF525 offline-first : réserve une plage de numéros pour (établissement, caisse, type). Le client consomme la plage localement.';



CREATE OR REPLACE FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_available_stock numeric;
  v_ps_id uuid;
BEGIN
  SELECT public.get_available_stock(p_product_id, p_organization_id)
  INTO v_available_stock;

  IF v_available_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  SELECT ps.id INTO v_ps_id
  FROM public.product_stocks ps
  INNER JOIN public.product_compositions pc ON pc.id = ps.product_composition_id
  WHERE pc.component_product_id = p_product_id
    AND ps.organization_id = p_organization_id
    AND COALESCE(ps.deleted, false) = false
  ORDER BY CASE WHEN pc.main_product_id = pc.component_product_id THEN 0 ELSE 1 END, ps.created_at NULLS LAST
  LIMIT 1;

  IF v_ps_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.product_stocks
  SET reserved_stock = reserved_stock + p_quantity
  WHERE id = v_ps_id;

  PERFORM public.add_stock_movement(
    p_product_id,
    p_organization_id,
    'reservation',
    p_quantity,
    p_reference_type,
    p_reference_id,
    'Réservation automatique'
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_deleted_record"("table_name" "text", "record_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    sql_query TEXT;
    result BOOLEAN;
BEGIN
    -- Construire la requête SQL dynamiquement
    sql_query := format('UPDATE %I SET deleted = false, updated_at = NOW() WHERE id = $1 AND deleted = true', table_name);
    
    -- Exécuter la requête
    EXECUTE sql_query USING record_id;
    
    -- Vérifier si une ligne a été affectée
    GET DIAGNOSTICS result = ROW_COUNT;
    
    RETURN result > 0;
END;
$_$;


ALTER FUNCTION "public"."restore_deleted_record"("table_name" "text", "record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slot_to_time"("slot_number" integer) RETURNS time without time zone
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN (slot_number * INTERVAL '15 minutes')::TIME;
END;
$$;


ALTER FUNCTION "public"."slot_to_time"("slot_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_custom_domain"("domain_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('custom_domains', domain_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_custom_domain"("domain_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_establishment"("est_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('establishments', est_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_establishment"("est_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_order"("order_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('orders', order_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_order"("order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_organization"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('organizations', org_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_organization"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_product"("product_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('products', product_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_product"("product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_record"("table_name" "text", "record_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    sql_query TEXT;
    result BOOLEAN;
BEGIN
    -- Construire la requête SQL dynamiquement
    sql_query := format('UPDATE %I SET deleted = true, updated_at = NOW() WHERE id = $1 AND deleted = false', table_name);
    
    -- Exécuter la requête
    EXECUTE sql_query USING record_id;
    
    -- Vérifier si une ligne a été affectée
    GET DIAGNOSTICS result = ROW_COUNT;
    
    RETURN result > 0;
END;
$_$;


ALTER FUNCTION "public"."soft_delete_record"("table_name" "text", "record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN soft_delete_record('users', user_id);
END;
$$;


ALTER FUNCTION "public"."soft_delete_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_establishment_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Mettre à jour establishment_slug si establishment_id change
    IF TG_OP = 'INSERT' OR OLD.establishment_id != NEW.establishment_id THEN
        SELECT slug INTO NEW.establishment_slug
        FROM establishments
        WHERE id = NEW.establishment_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Établissement non trouvé avec l''ID: %', NEW.establishment_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_establishment_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_auth_uid"() RETURNS TABLE("current_user_id" "uuid", "current_user_role" "text", "test_result" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as current_user_id,
        auth.role() as current_user_role,
        CASE 
            WHEN auth.uid() IS NOT NULL THEN 'AUTHENTIFIÉ'
            ELSE 'NON AUTHENTIFIÉ'
        END as test_result;
END;
$$;


ALTER FUNCTION "public"."test_auth_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."time_range_to_slots"("start_time" time without time zone, "end_time" time without time zone) RETURNS integer[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    start_slot INTEGER;
    end_slot INTEGER;
    slots INTEGER[] := '{}';
    i INTEGER;
BEGIN
    start_slot := time_to_slot(start_time);
    end_slot := time_to_slot(end_time);
    
    FOR i IN start_slot..end_slot-1 LOOP
        slots := array_append(slots, i);
    END LOOP;
    
    RETURN slots;
END;
$$;


ALTER FUNCTION "public"."time_range_to_slots"("start_time" time without time zone, "end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."time_to_slot"("time_value" time without time zone) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN EXTRACT(HOUR FROM time_value) * 4 + EXTRACT(MINUTE FROM time_value) / 15;
END;
$$;


ALTER FUNCTION "public"."time_to_slot"("time_value" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_fn_create_default_payment_methods"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM create_default_payment_methods_for_establishment(NEW.id, NEW.organization_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_fn_create_default_payment_methods"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unreserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ps_id uuid;
BEGIN
  SELECT ps.id INTO v_ps_id
  FROM public.product_stocks ps
  INNER JOIN public.product_compositions pc ON pc.id = ps.product_composition_id
  WHERE pc.component_product_id = p_product_id
    AND ps.organization_id = p_organization_id
    AND COALESCE(ps.deleted, false) = false
  ORDER BY CASE WHEN pc.main_product_id = pc.component_product_id THEN 0 ELSE 1 END, ps.created_at NULLS LAST
  LIMIT 1;

  IF v_ps_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.product_stocks
  SET reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = v_ps_id;

  PERFORM public.add_stock_movement(
    p_product_id,
    p_organization_id,
    'unreservation',
    -p_quantity,
    p_reference_type,
    p_reference_id,
    'Libération de réservation'
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."unreserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_booking_exceptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_booking_exceptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_custom_domains_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_custom_domains_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_logs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_logs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_establishment_gallery_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_establishment_gallery_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gallery_sections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_gallery_sections_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_products_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_order_products_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ps_id uuid;
  v_establishment_id uuid;
  v_pc_id uuid;
BEGIN
  SELECT ps.id INTO v_ps_id
  FROM public.product_stocks ps
  INNER JOIN public.product_compositions pc ON pc.id = ps.product_composition_id
  WHERE pc.component_product_id = NEW.product_id
    AND ps.organization_id = NEW.organization_id
  ORDER BY CASE WHEN pc.main_product_id = pc.component_product_id THEN 0 ELSE 1 END, ps.created_at NULLS LAST
  LIMIT 1;

  IF v_ps_id IS NOT NULL THEN
    UPDATE public.product_stocks
    SET
      current_stock = NEW.quantity_after,
      updated_at = NOW(),
      last_updated_by = NEW.created_by
    WHERE id = v_ps_id;
  ELSE
    SELECT e.id INTO v_establishment_id
    FROM public.establishments e
    WHERE e.organization_id = NEW.organization_id
    LIMIT 1;

    IF v_establishment_id IS NULL THEN
      RAISE EXCEPTION 'update_product_stock: aucun établissement pour organization_id %', NEW.organization_id;
    END IF;

    v_pc_id := public.ensure_self_product_composition(NEW.product_id, v_establishment_id, NEW.organization_id);

    INSERT INTO public.product_stocks (
      product_composition_id,
      organization_id,
      establishment_id,
      current_stock,
      min_stock,
      reserved_stock,
      unit,
      created_at,
      updated_at,
      last_updated_by,
      deleted
    ) VALUES (
      v_pc_id,
      NEW.organization_id,
      v_establishment_id,
      NEW.quantity_after,
      0,
      0,
      'piece',
      NOW(),
      NOW(),
      NEW.created_by,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_product_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_booking_exception_slots"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Valider les créneaux fermés si présents
    IF NEW.closed_slots IS NOT NULL AND array_length(NEW.closed_slots, 1) > 0 THEN
        IF NOT validate_closed_slots(NEW.closed_slots) THEN
            RAISE EXCEPTION 'Créneaux fermés invalides. Doivent être entre 0 et 95.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_booking_exception_slots"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_closed_slots"("slots" integer[]) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    slot INTEGER;
BEGIN
    IF slots IS NULL THEN
        RETURN TRUE;
    END IF;
    
    IF array_length(slots, 1) = 0 THEN
        RETURN FALSE;
    END IF;
    
    FOREACH slot IN ARRAY slots LOOP
        IF slot < 0 OR slot > 95 THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_closed_slots"("slots" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_domain_format"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    -- Vérifier que le domaine est en minuscules
    IF NEW.domain != LOWER(NEW.domain) THEN
        RAISE EXCEPTION 'Le domaine doit être en minuscules';
    END IF;
    
    -- Vérifier que le domaine ne contient pas d'espaces
    IF NEW.domain LIKE '% %' THEN
        RAISE EXCEPTION 'Le domaine ne peut pas contenir d''espaces';
    END IF;
    
    -- Vérifier que le domaine commence et finit par un caractère alphanumérique
    IF NEW.domain !~ '^[a-z0-9].*[a-z0-9]$' THEN
        RAISE EXCEPTION 'Le domaine doit commencer et finir par un caractère alphanumérique';
    END IF;
    
    -- Vérifier que le domaine ne contient que des caractères valides
    IF NEW.domain !~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$' THEN
        RAISE EXCEPTION 'Le domaine contient des caractères invalides';
    END IF;
    
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."validate_domain_format"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "display_name" character varying(255) NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "is_system_action" boolean DEFAULT false,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    CONSTRAINT "actions_action_type_check" CHECK ((("action_type")::"text" = ANY ((ARRAY['navigation'::character varying, 'category_open'::character varying, 'product_show'::character varying, 'custom_function'::character varying])::"text"[])))
);


ALTER TABLE "public"."actions" OWNER TO "postgres";


COMMENT ON TABLE "public"."actions" IS 'Catalogue des actions disponibles pour les éléments de grille (navigation, ouverture catégorie, affichage produit)';



CREATE TABLE IF NOT EXISTS "public"."booking_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "booking_slot_id" "uuid",
    "exception_type" "text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "date" "date",
    "closed_slots" integer[],
    "reason" "text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted" boolean DEFAULT false,
    CONSTRAINT "booking_exceptions_dates_check" CHECK ((("start_date" IS NULL) OR ("end_date" IS NULL) OR ("start_date" <= "end_date"))),
    CONSTRAINT "booking_exceptions_exception_type_check" CHECK (("exception_type" = ANY (ARRAY['period'::"text", 'single_day'::"text", 'service'::"text", 'time_slots'::"text"]))),
    CONSTRAINT "booking_exceptions_period_check" CHECK (((("exception_type" = 'period'::"text") AND ("start_date" IS NOT NULL) AND ("end_date" IS NOT NULL) AND ("date" IS NULL) AND ("booking_slot_id" IS NULL)) OR ("exception_type" <> 'period'::"text"))),
    CONSTRAINT "booking_exceptions_service_check" CHECK (((("exception_type" = 'service'::"text") AND ("booking_slot_id" IS NOT NULL) AND ("date" IS NOT NULL) AND ("start_date" IS NULL) AND ("end_date" IS NULL)) OR ("exception_type" <> 'service'::"text"))),
    CONSTRAINT "booking_exceptions_single_day_check" CHECK (((("exception_type" = 'single_day'::"text") AND ("date" IS NOT NULL) AND ("start_date" IS NULL) AND ("end_date" IS NULL) AND ("booking_slot_id" IS NULL)) OR ("exception_type" <> 'single_day'::"text"))),
    CONSTRAINT "booking_exceptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "booking_exceptions_time_slots_check" CHECK (((("exception_type" = 'time_slots'::"text") AND ("closed_slots" IS NOT NULL) AND ("array_length"("closed_slots", 1) > 0) AND ("date" IS NOT NULL) AND ("start_date" IS NULL) AND ("end_date" IS NULL) AND ("booking_slot_id" IS NOT NULL)) OR ("exception_type" <> 'time_slots'::"text")))
);


ALTER TABLE "public"."booking_exceptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."booking_exceptions" IS 'Gestion des exceptions pour les créneaux de réservation';



COMMENT ON COLUMN "public"."booking_exceptions"."booking_slot_id" IS 'ID du service concerné (NULL pour les exceptions globales)';



COMMENT ON COLUMN "public"."booking_exceptions"."exception_type" IS 'Type d''exception: period, single_day, service, time_slots';



COMMENT ON COLUMN "public"."booking_exceptions"."closed_slots" IS 'Array d''entiers représentant les créneaux fermés (0=0h00, 1=0h15, 2=0h30, etc.)';



CREATE TABLE IF NOT EXISTS "public"."booking_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_name" character varying(100) NOT NULL,
    "max_capacity" integer DEFAULT 10,
    "is_active" boolean DEFAULT true,
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "organization_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0,
    "default_duration_minutes" integer DEFAULT 120 NOT NULL,
    CONSTRAINT "booking_slots_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "booking_slots_time_check" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."booking_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."booking_slots" IS 'Créneaux de réservation définis manuellement (logique métier)';



COMMENT ON COLUMN "public"."booking_slots"."start_time" IS 'Heure de début du créneau de réservation';



COMMENT ON COLUMN "public"."booking_slots"."end_time" IS 'Heure de fin du créneau de réservation';



COMMENT ON COLUMN "public"."booking_slots"."slot_name" IS 'Nom du service (ex: Déjeuner, Dîner)';



CREATE TABLE IF NOT EXISTS "public"."booking_table_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "table_id" "uuid" NOT NULL,
    "room_id" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "start_datetime" timestamp with time zone NOT NULL,
    "end_datetime" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."booking_table_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "service_name" "text" NOT NULL,
    "customer_first_name" "text" NOT NULL,
    "customer_last_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "number_of_guests" integer NOT NULL,
    "special_requests" "text",
    "status" "text" DEFAULT 'confirmed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "start_time" time without time zone DEFAULT '19:00:00'::time without time zone NOT NULL,
    "end_time" time without time zone DEFAULT '21:00:00'::time without time zone NOT NULL,
    "booking_slot_id" "uuid",
    CONSTRAINT "bookings_number_of_guests_check" CHECK ((("number_of_guests" > 0) AND ("number_of_guests" <= 50))),
    CONSTRAINT "bookings_start_before_end" CHECK (("end_time" > "start_time")),
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'Réservations des clients';



COMMENT ON COLUMN "public"."bookings"."id" IS 'Identifiant unique de la réservation';



COMMENT ON COLUMN "public"."bookings"."establishment_id" IS 'Référence vers l''établissement';



COMMENT ON COLUMN "public"."bookings"."date" IS 'Date de la réservation';



COMMENT ON COLUMN "public"."bookings"."time" IS 'Heure de la réservation';



COMMENT ON COLUMN "public"."bookings"."service_name" IS 'Nom du service (ex: Déjeuner, Dîner)';



COMMENT ON COLUMN "public"."bookings"."customer_first_name" IS 'Prénom du client';



COMMENT ON COLUMN "public"."bookings"."customer_last_name" IS 'Nom du client';



COMMENT ON COLUMN "public"."bookings"."customer_email" IS 'Email du client';



COMMENT ON COLUMN "public"."bookings"."customer_phone" IS 'Téléphone du client';



COMMENT ON COLUMN "public"."bookings"."number_of_guests" IS 'Nombre de personnes';



COMMENT ON COLUMN "public"."bookings"."special_requests" IS 'Demandes spéciales du client';



COMMENT ON COLUMN "public"."bookings"."status" IS 'Statut de la réservation (pending, confirmed, cancelled, completed)';



COMMENT ON COLUMN "public"."bookings"."organization_id" IS 'Référence vers l''organisation';



CREATE TABLE IF NOT EXISTS "public"."cash_withdrawals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "daily_found_id" "uuid" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."cash_withdrawals" OWNER TO "postgres";


COMMENT ON TABLE "public"."cash_withdrawals" IS 'Retraits d''espèces liés à une caisse du jour (daily_found).';



COMMENT ON COLUMN "public"."cash_withdrawals"."amount" IS 'Montant d''espèces retiré (valeur positive, en euros).';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "printer_id" "uuid",
    "vat_rate_id" "uuid"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Table des catégories avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."categories"."printer_id" IS 'Imprimante par défaut pour la catégorie (bons cuisine / tickets internes).';



CREATE TABLE IF NOT EXISTS "public"."category_grid_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "product_id" "uuid",
    "grid_row" integer DEFAULT 0 NOT NULL,
    "grid_column" integer DEFAULT 0 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "background_color" character varying(7) DEFAULT '#FFFFFF'::character varying,
    "text_color" character varying(7) DEFAULT '#000000'::character varying,
    "icon_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "menu_id" "uuid",
    "item_type" "text" DEFAULT 'product'::"text" NOT NULL,
    "parent_item_id" "uuid",
    "label" "text",
    "establishment_id" "uuid" NOT NULL,
    "action" "jsonb" DEFAULT '{"type": "none", "parameters": {}}'::"jsonb",
    "deleted" boolean DEFAULT false,
    "formula_id" "uuid",
    CONSTRAINT "category_grid_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'category'::"text", 'action'::"text", 'formula'::"text"]))),
    CONSTRAINT "category_grid_items_type_coherence_chk" CHECK (
CASE "item_type"
    WHEN 'product'::"text" THEN (("product_id" IS NOT NULL) AND ("category_id" IS NULL) AND ("formula_id" IS NULL))
    WHEN 'category'::"text" THEN (("category_id" IS NOT NULL) AND ("product_id" IS NULL) AND ("formula_id" IS NULL))
    WHEN 'action'::"text" THEN (("product_id" IS NULL) AND ("category_id" IS NULL) AND ("formula_id" IS NULL))
    WHEN 'formula'::"text" THEN (("formula_id" IS NOT NULL) AND ("product_id" IS NULL) AND ("category_id" IS NULL))
    ELSE NULL::boolean
END)
);


ALTER TABLE "public"."category_grid_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."category_grid_items" IS 'Table unifiée pour gérer les grilles de catégories et produits avec positionnement';



COMMENT ON COLUMN "public"."category_grid_items"."category_id" IS 'NULL si c''est un produit, sinon référence vers la catégorie';



COMMENT ON COLUMN "public"."category_grid_items"."product_id" IS 'NULL si c''est une catégorie, sinon référence vers le produit';



COMMENT ON COLUMN "public"."category_grid_items"."action" IS 'Comportement au tap : { "type", "parameters" }';



CREATE TABLE IF NOT EXISTS "public"."custom_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" character varying(255) NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "establishment_slug" character varying(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."custom_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_found" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "closed_at_at" timestamp with time zone DEFAULT "now"(),
    "opened" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "closing_cash_count" numeric(14,2),
    "closing_cash_to_keep" numeric(14,2),
    "opening_cash_amount" numeric(14,2),
    "opened_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_found" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_found" IS 'Table des fonds quotidiens avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."daily_found"."closing_cash_count" IS 'Comptage réel des espèces à la fermeture de la caisse (montant en tiroir).';



COMMENT ON COLUMN "public"."daily_found"."closing_cash_to_keep" IS 'Montant d''espèces conservé comme fond de caisse pour la prochaine ouverture.';



COMMENT ON COLUMN "public"."daily_found"."opening_cash_amount" IS 'Montant d''espèces présent au début de la caisse (fond de caisse initial).';



CREATE TABLE IF NOT EXISTS "public"."device_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "orga_user_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "mobile_user_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."device_sessions" IS 'Table pour gérer les sessions des devices avec synchronisation serveur';



COMMENT ON COLUMN "public"."device_sessions"."device_id" IS 'ID unique du device (généré localement)';



COMMENT ON COLUMN "public"."device_sessions"."organization_id" IS 'ID de l''organisation (multi-tenant)';



COMMENT ON COLUMN "public"."device_sessions"."session_data" IS 'Données complètes de session en JSONB';



COMMENT ON COLUMN "public"."device_sessions"."last_activity" IS 'Dernière activité du device';



COMMENT ON COLUMN "public"."device_sessions"."expires_at" IS 'Date d''expiration de la session (optionnelle)';



COMMENT ON COLUMN "public"."device_sessions"."is_active" IS 'Statut actif de la session';



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial_number" character varying(100) NOT NULL,
    "establishment_id" "uuid",
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "device_info" "jsonb",
    "establishment_name" "text",
    "device_role" character varying(20) DEFAULT 'slave'::character varying NOT NULL,
    "last_sync_at" timestamp with time zone,
    "manufacturer" character varying(100),
    "model" character varying(100),
    "is_active" boolean DEFAULT true,
    "port_attribue" integer,
    "software_version" character varying,
    "mods" "text"[] DEFAULT ARRAY['caisse'::"text"] NOT NULL,
    "display" "text" DEFAULT 'tablet'::"text" NOT NULL,
    CONSTRAINT "chk_port_attribue" CHECK ((("port_attribue" IS NULL) OR (("port_attribue" >= 8080) AND ("port_attribue" <= 8090) AND ("port_attribue" <> ALL (ARRAY[8081, 8082]))))),
    CONSTRAINT "devices_device_role_check" CHECK ((("device_role")::"text" = ANY (ARRAY['master'::"text", 'slave'::"text"]))),
    CONSTRAINT "devices_display_check" CHECK (("display" = ANY (ARRAY['tablet'::"text", 'pad'::"text"]))),
    CONSTRAINT "devices_mods_check" CHECK (("mods" <@ ARRAY['caisse'::"text", 'kds'::"text", 'haccp'::"text"]))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."devices" IS 'Appareils connectés au système WiFi avec identité basée sur Serial Number';



COMMENT ON COLUMN "public"."devices"."serial_number" IS 'Numéro de série unique de l''appareil (identifiant stable)';



COMMENT ON COLUMN "public"."devices"."establishment_id" IS 'Établissement associé à l''appareil';



COMMENT ON COLUMN "public"."devices"."organization_id" IS 'ID de l''organisation pour RLS multi-tenant';



COMMENT ON COLUMN "public"."devices"."device_info" IS 'JSON contenant brand, model, serialNumber, androidId, osVersion, deviceType';



COMMENT ON COLUMN "public"."devices"."establishment_name" IS 'Nom de l''établissement pour éviter les joins';



COMMENT ON COLUMN "public"."devices"."device_role" IS 'Rôle de l''appareil (master ou slave)';



COMMENT ON COLUMN "public"."devices"."last_sync_at" IS 'Timestamp de la dernière synchronisation réussie';



COMMENT ON COLUMN "public"."devices"."manufacturer" IS 'Fabricant de l''appareil';



COMMENT ON COLUMN "public"."devices"."model" IS 'Modèle exact de l''appareil';



COMMENT ON COLUMN "public"."devices"."is_active" IS 'Indique si l''appareil est actif dans le système';



COMMENT ON COLUMN "public"."devices"."port_attribue" IS 'Port WiFi attribué à l''appareil pour la communication Master/Slave. 
Ports disponibles : 8080, 8083-8089. Ports 8081-8082 réservés par Expo.';



COMMENT ON CONSTRAINT "devices_device_role_check" ON "public"."devices" IS 'Rôle LAN / hiérarchie : master ou slave uniquement (les modules sont dans mods).';



COMMENT ON CONSTRAINT "devices_mods_check" ON "public"."devices" IS 'Chaque élément de mods doit être parmi caisse, kds, haccp.';



CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "booking_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "created_by" "uuid",
    CONSTRAINT "email_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_logs" IS 'Table pour tracer tous les emails envoyés par le système';



CREATE TABLE IF NOT EXISTS "public"."establishment_gallery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "image_name" character varying(255),
    "image_description" "text",
    "alt_text" character varying(500),
    "file_size" integer,
    "mime_type" character varying(100),
    "dimensions" "jsonb",
    "display_order" integer DEFAULT 0,
    "is_public" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" DEFAULT ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."establishment_gallery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishment_gallery_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "image_id" "uuid" NOT NULL,
    "section" character varying(50) NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    CONSTRAINT "establishment_gallery_sections_section_check" CHECK ((("section")::"text" = ANY ((ARRAY['hero_carousel'::character varying, 'home_cards'::character varying, 'gallery'::character varying])::"text"[])))
);


ALTER TABLE "public"."establishment_gallery_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "slug" character varying(255),
    "description" "text",
    "address" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "is_public" boolean DEFAULT true,
    "logo_url" "text",
    "cover_image_url" "text",
    "website" character varying(255),
    "seo_title" character varying(255),
    "seo_description" "text",
    "created_by" "uuid",
    "no_tva" "text",
    "siret" "text",
    "postal_code" numeric,
    "city" "text",
    "country" "text" DEFAULT 'France'::"text",
    "code_naf" "text",
    "printer_id" "uuid"
);


ALTER TABLE "public"."establishments" OWNER TO "postgres";


COMMENT ON TABLE "public"."establishments" IS 'Table des établissements avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."establishments"."country" IS 'Pays de l''établissement (R13 émetteur).';



COMMENT ON COLUMN "public"."establishments"."code_naf" IS 'Code NAF/APE (R13 émetteur).';



COMMENT ON COLUMN "public"."establishments"."printer_id" IS 'Imprimante par défaut de l’établissement (fallback pour toutes les impressions).';



CREATE TABLE IF NOT EXISTS "public"."formula_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "formula_id" "uuid" NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false,
    "supplement_price" numeric(10,2) DEFAULT 0,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."formula_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."formula_products" IS 'Produits associés aux slots de formule';



COMMENT ON COLUMN "public"."formula_products"."organization_id" IS 'Organisation propriétaire du produit de formule';



COMMENT ON COLUMN "public"."formula_products"."establishment_id" IS 'Établissement propriétaire du produit de formule';



COMMENT ON COLUMN "public"."formula_products"."is_default" IS 'Produit par défaut pour ce slot';



COMMENT ON COLUMN "public"."formula_products"."supplement_price" IS 'Supplément sur le prix de base de la formule';



COMMENT ON COLUMN "public"."formula_products"."deleted" IS 'Indique si l''enregistrement est supprimé (soft delete)';



CREATE TABLE IF NOT EXISTS "public"."formula_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "formula_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "slot_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" character varying(255) DEFAULT 'Slot'::character varying NOT NULL,
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."formula_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."formula_slots" IS 'Slots de formule (entrée, plat, dessert)';



COMMENT ON COLUMN "public"."formula_slots"."organization_id" IS 'Organisation propriétaire du slot';



COMMENT ON COLUMN "public"."formula_slots"."establishment_id" IS 'Établissement propriétaire du slot';



COMMENT ON COLUMN "public"."formula_slots"."slot_order" IS 'Ordre d''affichage du slot';



COMMENT ON COLUMN "public"."formula_slots"."deleted" IS 'Indique si l''enregistrement est supprimé (soft delete)';



CREATE TABLE IF NOT EXISTS "public"."formulas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "menu_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "establishment_id" "uuid"
);


ALTER TABLE "public"."formulas" OWNER TO "postgres";


COMMENT ON TABLE "public"."formulas" IS 'Table des formules de restaurant (E/P, P/D, E/P/D)';



COMMENT ON COLUMN "public"."formulas"."name" IS 'Nom de la formule (ex: "Formule Midi", "Formule Soir")';



COMMENT ON COLUMN "public"."formulas"."organization_id" IS 'Organisation propriétaire de la formule';



COMMENT ON COLUMN "public"."formulas"."price" IS 'Prix fixe de la formule';



COMMENT ON COLUMN "public"."formulas"."deleted" IS 'Indique si l''enregistrement est supprimé (soft delete)';



CREATE TABLE IF NOT EXISTS "public"."menu_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "menu_id" "uuid" NOT NULL,
    "day_of_week" integer,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "valid_from" "date",
    "valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."menu_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid",
    "name" "text",
    "organization_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_public" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "description" "text",
    "image_url" "text",
    "type" character varying(50) DEFAULT 'lunch'::character varying,
    "created_by" "uuid",
    "pricing_strategy" "text" DEFAULT 'menu_price_fallback_catalog'::"text" NOT NULL,
    CONSTRAINT "menus_pricing_strategy_check" CHECK (("pricing_strategy" = ANY (ARRAY['catalog_only'::"text", 'menu_price_fallback_catalog'::"text", 'menu_price_required'::"text"])))
);


ALTER TABLE "public"."menus" OWNER TO "postgres";


COMMENT ON TABLE "public"."menus" IS 'Table des menus avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."menus"."is_active" IS 'Indique si la carte est active et visible';



COMMENT ON COLUMN "public"."menus"."is_public" IS 'Indique si la carte est visible sur le site web public';



COMMENT ON COLUMN "public"."menus"."display_order" IS 'Ordre d''affichage des cartes';



COMMENT ON COLUMN "public"."menus"."description" IS 'Description de la carte';



COMMENT ON COLUMN "public"."menus"."image_url" IS 'URL de l''image de la carte';



COMMENT ON COLUMN "public"."menus"."type" IS 'Type de carte: lunch, dinner, happy_hour, breakfast, special, web';



COMMENT ON COLUMN "public"."menus"."pricing_strategy" IS 'catalog_only: toujours le prix produit. menu_price_fallback_catalog: prix ligne menu si non null, sinon catalogue. menu_price_required: prix ligne menu obligatoire (sinon repli catalogue côté appli en attendant correction).';



CREATE TABLE IF NOT EXISTS "public"."menus_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "menus_id" "uuid",
    "products_id" "uuid",
    "price" numeric(10,2),
    "organization_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."menus_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."menus_products" IS 'Table de liaison entre menus et produits avec gestion des prix personnalisés et organisation';



COMMENT ON COLUMN "public"."menus_products"."menus_id" IS 'Référence vers le menu';



COMMENT ON COLUMN "public"."menus_products"."products_id" IS 'Référence vers le produit';



COMMENT ON COLUMN "public"."menus_products"."price" IS 'Prix personnalisé pour ce produit dans ce menu (peut surcharger le prix du produit)';



COMMENT ON COLUMN "public"."menus_products"."organization_id" IS 'Organisation propriétaire';



CREATE TABLE IF NOT EXISTS "public"."menus_products_price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "menus_products_id" "uuid" NOT NULL,
    "sale_price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "menus_products_price_history_sale_price_check" CHECK (("sale_price" >= (0)::numeric))
);


ALTER TABLE "public"."menus_products_price_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."menus_products_price_history" IS 'Évolution du prix de vente pour chaque ligne menus_products (grille / menu par établissement).';



COMMENT ON COLUMN "public"."menus_products_price_history"."source" IS 'Ex. grid_ui, bulk_catalog_sync, import — pour filtrer les séries.';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "deleted" boolean DEFAULT false,
    "created_by" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Table des messages avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."mobile_user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mobile_user_id" "uuid",
    "permission" character varying(100) NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "uuid",
    "organization_id" "uuid",
    "establishment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."mobile_user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mobile_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "firstname" "text" NOT NULL,
    "lastname" "text" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "role" character varying(20) DEFAULT 'server'::character varying,
    "email" character varying(255),
    "phone" character varying(20),
    "is_active" boolean DEFAULT true,
    "pin_code" "text",
    CONSTRAINT "mobile_users_pin_code_length" CHECK (("length"("pin_code") >= 4)),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['server'::character varying, 'chef'::character varying, 'manager'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."mobile_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."mobile_users" IS 'Table optimisée pour l''application mobile - utilisateurs opérationnels avec authentification PIN';



COMMENT ON COLUMN "public"."mobile_users"."role" IS 'Rôle: manager, server, etc.';



COMMENT ON COLUMN "public"."mobile_users"."pin_code" IS 'Code PIN pour l''authentification mobile (min 4 chiffres)';



CREATE TABLE IF NOT EXISTS "public"."nf525_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nf525_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_config" IS 'NF525: paramètres de restitution (n° certificat, version logiciel, libellés)';



CREATE TABLE IF NOT EXISTS "public"."nf525_jet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "event_id" bigint NOT NULL,
    "code_event" integer NOT NULL,
    "label" "text",
    "event_at" timestamp with time zone NOT NULL,
    "operator_code" "text",
    "device_id" "uuid",
    "report_previous_signature" "text",
    "previous_signature_base64url" "text",
    "signature_base64url" "text",
    "hash_chain_input" "text",
    "purgeable" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "establishment_id" "uuid"
);


ALTER TABLE "public"."nf525_jet" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_jet" IS 'NF525 R19: Journal des événements techniques (signature et chaînage)';



CREATE TABLE IF NOT EXISTS "public"."nf525_piece_recap_tva" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nf525_piece_id" "uuid" NOT NULL,
    "vat_rate" numeric(5,2) NOT NULL,
    "total_ht" numeric(12,2) NOT NULL,
    "amount_vat" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nf525_piece_recap_tva" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_piece_recap_tva" IS 'NF525 R13: récapitulatif par taux de TVA pour une pièce';



CREATE TABLE IF NOT EXISTS "public"."nf525_pieces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "piece_number" "text" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "device_id" "uuid" NOT NULL,
    "piece_type" "text" NOT NULL,
    "operation_type" "text" DEFAULT 'vente'::"text" NOT NULL,
    "recorded_at" timestamp with time zone NOT NULL,
    "line_count" integer DEFAULT 0 NOT NULL,
    "emitter_snapshot" "jsonb",
    "signature_base64url" "text",
    "previous_signature_base64url" "text",
    "hash_chain_input" "text",
    "print_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mobile_user_id" "uuid",
    CONSTRAINT "nf525_pieces_piece_type_check" CHECK (("piece_type" = ANY (ARRAY['note'::"text", 'ticket'::"text", 'justificatif'::"text"])))
);


ALTER TABLE "public"."nf525_pieces" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_pieces" IS 'NF525 R13: pièces justificatives (ticket, note) avec signature et chaînage';



CREATE TABLE IF NOT EXISTS "public"."nf525_restitutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_type" "text" NOT NULL,
    "order_id" "uuid",
    "payment_id" "uuid",
    "organization_id" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "device_id" "uuid" NOT NULL,
    "amount_ttc" numeric(12,2) NOT NULL,
    "covers" integer,
    "is_refund_valid" boolean DEFAULT false NOT NULL,
    "duplicate_of_id" "uuid",
    "printed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "print_index" integer DEFAULT 1 NOT NULL,
    "nf525_piece_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "nf525_restitutions_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['ticket'::"text", 'note_de_frais'::"text", 'justificatif'::"text"])))
);


ALTER TABLE "public"."nf525_restitutions" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_restitutions" IS 'Journal des restitutions imprimées (ticket, note de frais) : original/duplicata, montant TTC, couverts, consommation remboursement.';



CREATE TABLE IF NOT EXISTS "public"."nf525_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "device_id" "uuid" NOT NULL,
    "piece_type" "text" NOT NULL,
    "last_number" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nf525_sequences_piece_type_check" CHECK (("piece_type" = ANY (ARRAY['ticket'::"text", 'note'::"text", 'justificatif'::"text"])))
);


ALTER TABLE "public"."nf525_sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_sequences" IS 'NF525 R13: compteurs pour numérotation continue des pièces par point de vente';



CREATE TABLE IF NOT EXISTS "public"."nf525_signing_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "signing_key_base64" "text" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nf525_signing_keys" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_signing_keys" IS 'NF525: clés de signature par établissement (une clé active par organisation/établissement)';



COMMENT ON COLUMN "public"."nf525_signing_keys"."signing_key_base64" IS 'Clé secrète de signature NF525 au format Base64, propre à un établissement';



CREATE TABLE IF NOT EXISTS "public"."opening_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "open_time" time without time zone NOT NULL,
    "close_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "name" character varying(100) DEFAULT 'Service'::character varying,
    "deleted" boolean DEFAULT false,
    CONSTRAINT "opening_hours_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "opening_hours_overnight_check" CHECK ((("open_time" < "close_time") OR (("open_time" > "close_time") AND ("close_time" < '06:00:00'::time without time zone))))
);


ALTER TABLE "public"."opening_hours" OWNER TO "postgres";


COMMENT ON TABLE "public"."opening_hours" IS 'Horaires d''ouverture par établissement et jour de la semaine';



COMMENT ON COLUMN "public"."opening_hours"."name" IS 'Nom du service/créneau (ex: "Déjeuner", "Dîner", "Soirée", "Happy Hour")';



CREATE TABLE IF NOT EXISTS "public"."opening_hours_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "exception_date" "date" NOT NULL,
    "exception_type" character varying(50) NOT NULL,
    "closed_hours" integer[],
    "modified_open_time" time without time zone,
    "modified_close_time" time without time zone,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "service_name" character varying(100),
    "slot_status" character varying(20) DEFAULT 'closed'::character varying,
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    CONSTRAINT "opening_hours_exceptions_exception_type_check" CHECK ((("exception_type")::"text" = ANY ((ARRAY['closed_day'::character varying, 'closed_hours'::character varying, 'modified_hours'::character varying])::"text"[]))),
    CONSTRAINT "opening_hours_exceptions_slot_status_check" CHECK ((("slot_status")::"text" = ANY ((ARRAY['closed'::character varying, 'modified'::character varying, 'open'::character varying])::"text"[]))),
    CONSTRAINT "opening_hours_exceptions_time_check" CHECK (((("exception_type")::"text" = 'closed_day'::"text") OR ((("exception_type")::"text" = 'closed_hours'::"text") AND ("closed_hours" IS NOT NULL)) OR ((("exception_type")::"text" = 'modified_hours'::"text") AND ("modified_open_time" IS NOT NULL) AND ("modified_close_time" IS NOT NULL) AND ("modified_open_time" < "modified_close_time"))))
);


ALTER TABLE "public"."opening_hours_exceptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."opening_hours_exceptions" IS 'Exceptions aux horaires d''ouverture (fermetures, modifications)';



COMMENT ON COLUMN "public"."opening_hours_exceptions"."closed_hours" IS 'Array d''incréments de 15min depuis 00h00 (ex: 60=15h00, 64=16h00)';



COMMENT ON COLUMN "public"."opening_hours_exceptions"."service_name" IS 'Nom du service concerné par l''exception';



COMMENT ON COLUMN "public"."opening_hours_exceptions"."slot_status" IS 'État du créneau: closed=fermé, modified=modifié, open=ouvert';



CREATE TABLE IF NOT EXISTS "public"."order_formulas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "formula_id" "uuid" NOT NULL,
    "formula_name" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."order_formulas" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_formulas" IS 'Formules créées dans les commandes - Liaison entre commandes et formules prédéfinies';



COMMENT ON COLUMN "public"."order_formulas"."order_id" IS 'Référence vers la commande';



COMMENT ON COLUMN "public"."order_formulas"."formula_id" IS 'Référence vers la formule prédéfinie';



COMMENT ON COLUMN "public"."order_formulas"."formula_name" IS 'Nom de la formule au moment de la création (snapshot)';



COMMENT ON COLUMN "public"."order_formulas"."organization_id" IS 'Organisation propriétaire (pour RLS multi-tenant)';



COMMENT ON COLUMN "public"."order_formulas"."establishment_id" IS 'Établissement propriétaire (pour RLS multi-tenant)';



COMMENT ON COLUMN "public"."order_formulas"."created_at" IS 'Date de création de la formule dans la commande';



CREATE TABLE IF NOT EXISTS "public"."order_payment_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orders_payments_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted" boolean DEFAULT false NOT NULL,
    "payment_method_name" "text",
    "base_amount" numeric(10,2),
    "extra_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "extra_type" "text",
    CONSTRAINT "order_payment_settlements_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "order_payment_settlements_extra_type_check" CHECK (("extra_type" = ANY (ARRAY['change'::"text", 'tip'::"text", 'credit'::"text"])))
);


ALTER TABLE "public"."order_payment_settlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payment_settlements" IS 'Règlements par moyen de paiement pour une note (order_payments). Une note peut être payée en plusieurs fois (ex. 15€ carte + 15€ espèces).';



CREATE TABLE IF NOT EXISTS "public"."order_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "orders_id" "uuid" DEFAULT "gen_random_uuid"(),
    "paid" boolean,
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."order_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payments" IS 'Table des paiements de commandes avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."order_payments_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric,
    "vat_rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "orders_payments_id" "uuid" DEFAULT "gen_random_uuid"(),
    "payment_type" "text",
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid",
    "order_products_id" "uuid"
);


ALTER TABLE "public"."order_payments_rows" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payments_rows" IS 'Table des lignes de paiements avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."order_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "suite_id" "uuid",
    "suite_position" integer,
    "product_name" "text" NOT NULL,
    "product_description" "text",
    "vat_rate" numeric(5,2) DEFAULT 0.00,
    "product_options" "jsonb" DEFAULT '[]'::"jsonb",
    "product_compositions" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "special_instructions" "text",
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "deleted" boolean DEFAULT false NOT NULL,
    "order_formulas_id" "uuid",
    "kitchen_sent_at" timestamp with time zone,
    "kitchen_print_count" integer DEFAULT 0 NOT NULL,
    "cancelled" boolean DEFAULT false NOT NULL,
    "cancel_reason" "text",
    CONSTRAINT "order_products_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_products_total_price_check" CHECK (("total_price" >= (0)::numeric)),
    CONSTRAINT "order_products_unit_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "order_products_vat_rate_check" CHECK ((("vat_rate" >= (0)::numeric) AND ("vat_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."order_products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_products"."kitchen_sent_at" IS 'Horodatage du premier envoi de la ligne en cuisine (NULL = jamais envoyée).';



COMMENT ON COLUMN "public"."order_products"."kitchen_print_count" IS 'Nombre de fois où la ligne a été envoyée / imprimée pour la cuisine.';



COMMENT ON COLUMN "public"."order_products"."cancelled" IS 'Indique si la ligne a été annulée (true) au lieu d''être réellement supprimée.';



COMMENT ON COLUMN "public"."order_products"."cancel_reason" IS 'Motif d''annulation de la ligne (ex. erreur de saisie, article indisponible, annulation client).';



CREATE TABLE IF NOT EXISTS "public"."order_refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_payment_id" "uuid" NOT NULL,
    "original_order_id" "uuid" NOT NULL,
    "original_nf525_piece_signature" "text",
    "amount" numeric(10,2) NOT NULL,
    "vat_rate" numeric(5,2),
    "reason" "text",
    "refund_method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "refunded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "device_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_refunds_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."order_refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_refunds" IS 'NF525 R13 : remboursements/avoirs. Chaque ligne génère une pièce justificatif chaînée à la pièce originale.';



COMMENT ON COLUMN "public"."order_refunds"."original_nf525_piece_signature" IS 'Signature Base64 URL de la pièce NF525 originale — utilisée comme previous_signature du justificatif.';



COMMENT ON COLUMN "public"."order_refunds"."refund_method" IS 'cash | card | cheque | other';



CREATE TABLE IF NOT EXISTS "public"."order_suites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "custom_name" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order" integer DEFAULT 0 NOT NULL,
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."order_suites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text",
    "tables_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "daily_found_id" "uuid" DEFAULT "gen_random_uuid"(),
    "opened" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "server_id" "uuid" NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Table des commandes avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."orders"."server_id" IS 'ID du serveur assigné à cette commande (obligatoire)';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Table des organisations avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payment_method_name" character varying(100) NOT NULL,
    "payment_method_type" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."printers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bdaddress" "text",
    "devicename" "text",
    "devicetype" "text",
    "ipaddress" "text",
    "macaddress" "text",
    "target" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "location" "text" DEFAULT 'array'::"text",
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid",
    "name" "text"
);


ALTER TABLE "public"."printers" OWNER TO "postgres";


COMMENT ON TABLE "public"."printers" IS 'Table des imprimantes avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."product_compositions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "main_product_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT false,
    "default_quantity" integer DEFAULT 1,
    "max_quantity" integer DEFAULT 10,
    "price_multiplier" numeric(5,2) DEFAULT NULL::numeric,
    "display_order" integer DEFAULT 0,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auto_open_modal" boolean DEFAULT false,
    "deleted" boolean DEFAULT false,
    "composition_kind" "text" DEFAULT 'recipe'::"text" NOT NULL,
    "show_in_customization" boolean DEFAULT true NOT NULL,
    "unit_supplement_price" numeric(12,2),
    CONSTRAINT "product_compositions_composition_kind_check" CHECK (("composition_kind" = ANY (ARRAY['recipe'::"text", 'modifier'::"text"]))),
    CONSTRAINT "product_compositions_supplement_price_xor_check" CHECK ((("price_multiplier" IS NULL) OR ("unit_supplement_price" IS NULL))),
    CONSTRAINT "valid_auto_open_modal" CHECK (("auto_open_modal" = ANY (ARRAY[true, false])))
);


ALTER TABLE "public"."product_compositions" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_compositions" IS 'Compositions de produits (ex: planche charcuterie avec composants individuels) - Chaque composant est un produit séparé avec son propre prix et stock';



COMMENT ON COLUMN "public"."product_compositions"."price_multiplier" IS 'Coefficient sur le prix du produit composant (ex. 0.50 = 50 %) ; NULL si non utilisé.';



COMMENT ON COLUMN "public"."product_compositions"."deleted" IS 'Indique si l''enregistrement est supprimé (soft delete)';



COMMENT ON COLUMN "public"."product_compositions"."composition_kind" IS 'recipe = inclus / conso stock recette ; modifier = option ou supplément (perso, prix).';



COMMENT ON COLUMN "public"."product_compositions"."show_in_customization" IS 'false = masquer dans la modale de personnalisation (ex. recette incluse) ; true = afficher.';



COMMENT ON COLUMN "public"."product_compositions"."unit_supplement_price" IS 'Montant TTC (ou HT selon convention app) par unité pour cette ligne de composition ; si renseigné, prioritaire sur price_multiplier.';



COMMENT ON CONSTRAINT "product_compositions_supplement_price_xor_check" ON "public"."product_compositions" IS 'Interdit d''avoir à la fois unit_supplement_price et price_multiplier (exclusion mutuelle).';



CREATE TABLE IF NOT EXISTS "public"."product_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "option_name" character varying(100) NOT NULL,
    "option_value" character varying(100) NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false,
    "option_price" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "tva_rate" numeric(5,2) DEFAULT 20.00 NOT NULL,
    "selection_type" character varying(20) DEFAULT 'unique'::character varying NOT NULL,
    "max_selections" integer DEFAULT 1,
    "allow_quantity" boolean DEFAULT false,
    "min_quantity" integer DEFAULT 1,
    "max_quantity" integer DEFAULT 10,
    "option_group" character varying(100),
    "is_required" boolean DEFAULT false,
    "price_adjustment" numeric(10,2) DEFAULT 0,
    "is_visible" boolean DEFAULT true,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auto_open_modal" boolean DEFAULT false,
    "deleted" boolean DEFAULT false,
    CONSTRAINT "product_options_selection_type_check" CHECK ((("selection_type")::"text" = ANY ((ARRAY['unique'::character varying, 'unlimited'::character varying, 'limited'::character varying])::"text"[]))),
    CONSTRAINT "valid_auto_open_modal" CHECK (("auto_open_modal" = ANY (ARRAY[true, false]))),
    CONSTRAINT "valid_option_price" CHECK (("option_price" >= (0)::numeric)),
    CONSTRAINT "valid_quantity_limits" CHECK ((((("selection_type")::"text" = 'limited'::"text") AND ("max_selections" > 0)) OR (("selection_type")::"text" = ANY ((ARRAY['unique'::character varying, 'unlimited'::character varying])::"text"[])))),
    CONSTRAINT "valid_tva_rate" CHECK ((("tva_rate" >= (0)::numeric) AND ("tva_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."product_options" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_options" IS 'Options configurables des produits (cuisson, taille, température) avec suppléments de prix';



COMMENT ON COLUMN "public"."product_options"."deleted" IS 'Indique si l''enregistrement est supprimé (soft delete)';



CREATE TABLE IF NOT EXISTS "public"."product_purchase_price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "unit_cost" numeric(14,4) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_ref" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "product_purchase_price_history_unit_cost_check" CHECK (("unit_cost" >= (0)::numeric))
);


ALTER TABLE "public"."product_purchase_price_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_purchase_price_history" IS 'Snapshots du coût d''achat unitaire par produit. establishment_id null = coût au niveau organisation.';



COMMENT ON COLUMN "public"."product_purchase_price_history"."unit_cost" IS 'Coût pour une unité alignée avec le produit / stock (ex. product_stocks.unit).';



CREATE TABLE IF NOT EXISTS "public"."product_stocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "current_stock" numeric(10,2) DEFAULT 0 NOT NULL,
    "min_stock" numeric(10,2) DEFAULT 0 NOT NULL,
    "max_stock" numeric(10,2),
    "reserved_stock" numeric(10,2) DEFAULT 0 NOT NULL,
    "unit" character varying(50) DEFAULT 'piece'::character varying NOT NULL,
    "low_stock_threshold" numeric(10,2),
    "critical_stock_threshold" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_updated_by" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "product_composition_id" "uuid" NOT NULL,
    "inventory_tracked" boolean DEFAULT true NOT NULL,
    CONSTRAINT "product_stocks_max_check" CHECK ((("max_stock" IS NULL) OR ("current_stock" <= "max_stock"))),
    CONSTRAINT "product_stocks_positive" CHECK ((("current_stock" >= ('-1'::integer)::numeric) AND ("min_stock" >= (0)::numeric) AND (("max_stock" IS NULL) OR ("max_stock" >= (0)::numeric)) AND (("low_stock_threshold" IS NULL) OR ("low_stock_threshold" >= (0)::numeric)) AND (("critical_stock_threshold" IS NULL) OR ("critical_stock_threshold" >= (0)::numeric)) AND ("reserved_stock" >= (0)::numeric))),
    CONSTRAINT "product_stocks_reserved" CHECK (("reserved_stock" >= (0)::numeric))
);


ALTER TABLE "public"."product_stocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_stocks" IS 'Stock par ligne de composition (product_compositions) et établissement ; alertes seuils.';



COMMENT ON COLUMN "public"."product_stocks"."reserved_stock" IS 'Stock réservé pour les commandes en cours';



COMMENT ON COLUMN "public"."product_stocks"."unit" IS 'Unité de mesure: piece, kg, liter, etc.';



COMMENT ON COLUMN "public"."product_stocks"."inventory_tracked" IS 'true = décrémentations / contrôles de stock actifs ; false = ligne conservée mais pas de gestion de stock sur cette ligne.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "is_available" boolean DEFAULT true,
    "created_by" "uuid",
    "category_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0,
    "vat_rate_id" "uuid",
    "printer_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Table des produits avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."products"."display_order" IS 'Ordre d''affichage des produits dans les grilles par catégorie';



COMMENT ON COLUMN "public"."products"."printer_id" IS 'Imprimante spécifique produit (override de categories.printer_id).';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "organization_id" "uuid",
    "deleted" boolean DEFAULT false,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Table des profils utilisateurs avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "background_color" "text" DEFAULT '#0F172A'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


COMMENT ON TABLE "public"."rooms" IS 'Table des salles avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "work_session_id" "uuid",
    "movement_type" character varying(50) NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "quantity_before" numeric(10,2) NOT NULL,
    "quantity_after" numeric(10,2) NOT NULL,
    "reference_id" "uuid",
    "reference_type" character varying(50),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "deleted" boolean DEFAULT false,
    CONSTRAINT "stock_movements_calculation_check" CHECK (("quantity_after" = ("quantity_before" + "quantity"))),
    CONSTRAINT "stock_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['purchase'::character varying, 'sale'::character varying, 'adjustment'::character varying, 'transfer'::character varying, 'waste'::character varying, 'production'::character varying, 'reservation'::character varying, 'unreservation'::character varying])::"text"[]))),
    CONSTRAINT "stock_movements_quantity_check" CHECK (("quantity" <> (0)::numeric))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_movements" IS 'Historique complet des mouvements de stock pour traçabilité';



COMMENT ON COLUMN "public"."stock_movements"."movement_type" IS 'Type de mouvement: purchase, sale, adjustment, transfer, waste, production, reservation, unreservation';



COMMENT ON COLUMN "public"."stock_movements"."reference_id" IS 'ID de référence (commande, facture, ajustement, etc.)';



CREATE TABLE IF NOT EXISTS "public"."tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "color" "text" DEFAULT '#4169E1'::"text" NOT NULL,
    "shape" "text" DEFAULT 'circle'::"text" NOT NULL,
    "rotation" numeric DEFAULT '0'::numeric NOT NULL,
    "room_id" "uuid" DEFAULT "gen_random_uuid"(),
    "x" numeric DEFAULT '50'::numeric NOT NULL,
    "y" numeric DEFAULT '100'::numeric NOT NULL,
    "width" numeric DEFAULT '80'::numeric NOT NULL,
    "height" numeric DEFAULT '80'::numeric NOT NULL,
    "seats" numeric DEFAULT '0'::numeric,
    "is_primary" boolean DEFAULT false,
    "tables_connections_id" "uuid",
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tables" OWNER TO "postgres";


COMMENT ON TABLE "public"."tables" IS 'Table des tables avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."tables_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "name" "text",
    "organization_id" "uuid",
    "created_by" "uuid"
);


ALTER TABLE "public"."tables_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."tables_connections" IS 'Table des connexions de tables avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."users_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."users_organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."users_organizations" IS 'Table de liaison entre utilisateurs et organisations. Les rôles sont maintenant dans users_roles';



CREATE TABLE IF NOT EXISTS "public"."vat_rate" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "value" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "vat_assoc_id" "uuid" DEFAULT "gen_random_uuid"(),
    "organization_id" "uuid",
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."vat_rate" OWNER TO "postgres";


COMMENT ON TABLE "public"."vat_rate" IS 'Table des taux de TVA avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."work_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "session_name" character varying(255) NOT NULL,
    "session_type" character varying(50) NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "work_sessions_duration_check" CHECK ((("ended_at" IS NULL) OR ("ended_at" >= "started_at"))),
    CONSTRAINT "work_sessions_session_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['service'::character varying, 'inventory'::character varying, 'maintenance'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "work_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."work_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_sessions" IS 'Sessions de travail pour traçabilité des opérations';



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_exceptions"
    ADD CONSTRAINT "booking_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_slots"
    ADD CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_slots"
    ADD CONSTRAINT "booking_slots_unique" UNIQUE ("establishment_id", "day_of_week", "start_time", "end_time", "slot_name");



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_no_overlap" EXCLUDE USING "gist" ("table_id" WITH =, "tstzrange"("start_datetime", "end_datetime", '[]'::"text") WITH &&) WHERE (("deleted" = false));



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_withdrawals"
    ADD CONSTRAINT "cash_withdrawals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_found"
    ADD CONSTRAINT "daily_found_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_device_id_key" UNIQUE ("device_id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_serial_number_key" UNIQUE ("serial_number");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_gallery"
    ADD CONSTRAINT "establishment_gallery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_section_establishment_id_image_id_sec_key" UNIQUE ("establishment_id", "image_id", "section");



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formula_slots"
    ADD CONSTRAINT "formula_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formulas"
    ADD CONSTRAINT "formulas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_schedules"
    ADD CONSTRAINT "menu_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menus_products_price_history"
    ADD CONSTRAINT "menus_products_price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobile_user_permissions"
    ADD CONSTRAINT "mobile_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobile_users"
    ADD CONSTRAINT "mobile_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_config"
    ADD CONSTRAINT "nf525_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."nf525_config"
    ADD CONSTRAINT "nf525_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_jet"
    ADD CONSTRAINT "nf525_jet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_piece_recap_tva"
    ADD CONSTRAINT "nf525_piece_recap_tva_nf525_piece_id_vat_rate_key" UNIQUE ("nf525_piece_id", "vat_rate");



ALTER TABLE ONLY "public"."nf525_piece_recap_tva"
    ADD CONSTRAINT "nf525_piece_recap_tva_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_establishment_id_device_id_piece_number_key" UNIQUE ("establishment_id", "device_id", "piece_number", "piece_type");



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_sequences"
    ADD CONSTRAINT "nf525_sequences_establishment_id_device_id_piece_type_key" UNIQUE ("establishment_id", "device_id", "piece_type");



ALTER TABLE ONLY "public"."nf525_sequences"
    ADD CONSTRAINT "nf525_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_signing_keys"
    ADD CONSTRAINT "nf525_signing_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_signing_keys"
    ADD CONSTRAINT "nf525_signing_keys_unique_active" UNIQUE ("organization_id", "establishment_id") DEFERRABLE;



ALTER TABLE ONLY "public"."opening_hours_exceptions"
    ADD CONSTRAINT "opening_hours_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opening_hours_exceptions"
    ADD CONSTRAINT "opening_hours_exceptions_unique_date" UNIQUE ("establishment_id", "exception_date");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_unique_establishment_day_slot" UNIQUE ("establishment_id", "day_of_week", "valid_from", "open_time");



ALTER TABLE ONLY "public"."order_formulas"
    ADD CONSTRAINT "order_formulas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "orders_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "orders_payments_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_purchase_price_history"
    ADD CONSTRAINT "product_purchase_price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_product_composition_establishment_unique" UNIQUE ("product_composition_id", "establishment_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tables_connections"
    ADD CONSTRAINT "tables_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "unique_product_option" UNIQUE ("product_id", "option_name", "option_value");



ALTER TABLE ONLY "public"."mobile_users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_user_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."vat_rate"
    ADD CONSTRAINT "vat_rate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "booking_slots_org_idx" ON "public"."booking_slots" USING "btree" ("organization_id");



CREATE INDEX "booking_table_allocations_establishment_start_idx" ON "public"."booking_table_allocations" USING "btree" ("establishment_id", "start_datetime");



CREATE INDEX "booking_table_allocations_table_start_idx" ON "public"."booking_table_allocations" USING "btree" ("table_id", "start_datetime");



CREATE INDEX "bookings_org_date_idx" ON "public"."bookings" USING "btree" ("organization_id", "date");



CREATE INDEX "cash_withdrawals_daily_found_id_idx" ON "public"."cash_withdrawals" USING "btree" ("daily_found_id");



CREATE INDEX "cash_withdrawals_establishment_id_idx" ON "public"."cash_withdrawals" USING "btree" ("establishment_id");



CREATE INDEX "cash_withdrawals_organization_id_idx" ON "public"."cash_withdrawals" USING "btree" ("organization_id");



CREATE INDEX "devices_organization_id_idx" ON "public"."devices" USING "btree" ("organization_id");



CREATE INDEX "idx_actions_establishment" ON "public"."actions" USING "btree" ("establishment_id");



CREATE INDEX "idx_booking_exceptions_establishment_date" ON "public"."booking_exceptions" USING "btree" ("establishment_id", "date") WHERE ("deleted" = false);



CREATE INDEX "idx_booking_exceptions_organization" ON "public"."booking_exceptions" USING "btree" ("organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_booking_exceptions_period" ON "public"."booking_exceptions" USING "btree" ("start_date", "end_date") WHERE (("deleted" = false) AND ("exception_type" = 'period'::"text"));



CREATE INDEX "idx_booking_exceptions_reason" ON "public"."booking_exceptions" USING "gin" ("to_tsvector"('"french"'::"regconfig", "reason")) WHERE ("deleted" = false);



CREATE INDEX "idx_booking_exceptions_service" ON "public"."booking_exceptions" USING "btree" ("booking_slot_id") WHERE (("deleted" = false) AND ("exception_type" = 'service'::"text"));



CREATE INDEX "idx_booking_exceptions_status" ON "public"."booking_exceptions" USING "btree" ("status") WHERE ("deleted" = false);



CREATE INDEX "idx_booking_exceptions_type" ON "public"."booking_exceptions" USING "btree" ("exception_type") WHERE ("deleted" = false);



CREATE INDEX "idx_booking_slots_date" ON "public"."booking_slots" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_booking_slots_deleted" ON "public"."booking_slots" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_booking_slots_display_order" ON "public"."booking_slots" USING "btree" ("establishment_id", "day_of_week", "display_order");



CREATE INDEX "idx_booking_slots_lookup" ON "public"."booking_slots" USING "btree" ("establishment_id", "day_of_week", "is_active");



CREATE INDEX "idx_bookings_customer_email" ON "public"."bookings" USING "btree" ("customer_email");



CREATE INDEX "idx_bookings_deleted" ON "public"."bookings" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_bookings_establishment_date" ON "public"."bookings" USING "btree" ("establishment_id", "date");



CREATE INDEX "idx_bookings_organization" ON "public"."bookings" USING "btree" ("organization_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_bookings_unique_customer_slot" ON "public"."bookings" USING "btree" ("establishment_id", "date", "time", "customer_email") WHERE ("status" = 'confirmed'::"text");



CREATE INDEX "idx_categories_organization_id" ON "public"."categories" USING "btree" ("organization_id");



CREATE INDEX "idx_categories_printer_id" ON "public"."categories" USING "btree" ("printer_id");



CREATE INDEX "idx_category_grid_items_action_gin" ON "public"."category_grid_items" USING "gin" ("action");



CREATE INDEX "idx_category_grid_items_action_type" ON "public"."category_grid_items" USING "btree" ((("action" ->> 'type'::"text")));



CREATE INDEX "idx_category_grid_items_category" ON "public"."category_grid_items" USING "btree" ("category_id") WHERE ("category_id" IS NOT NULL);



CREATE INDEX "idx_category_grid_items_establishment_id" ON "public"."category_grid_items" USING "btree" ("establishment_id");



CREATE INDEX "idx_category_grid_items_formula_id" ON "public"."category_grid_items" USING "btree" ("formula_id") WHERE ("formula_id" IS NOT NULL);



CREATE INDEX "idx_category_grid_items_product" ON "public"."category_grid_items" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_cgi_menu" ON "public"."category_grid_items" USING "btree" ("menu_id");



CREATE INDEX "idx_cgi_menu_parent" ON "public"."category_grid_items" USING "btree" ("menu_id", "parent_item_id", "display_order");



CREATE INDEX "idx_cgi_parent" ON "public"."category_grid_items" USING "btree" ("parent_item_id");



CREATE INDEX "idx_cgi_type" ON "public"."category_grid_items" USING "btree" ("item_type");



CREATE INDEX "idx_custom_domains_deleted" ON "public"."custom_domains" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_custom_domains_domain" ON "public"."custom_domains" USING "btree" ("domain");



CREATE INDEX "idx_custom_domains_establishment_id" ON "public"."custom_domains" USING "btree" ("establishment_id");



CREATE INDEX "idx_daily_found_organization_id" ON "public"."daily_found" USING "btree" ("organization_id");



CREATE INDEX "idx_device_sessions_device_id" ON "public"."device_sessions" USING "btree" ("device_id");



CREATE INDEX "idx_device_sessions_establishment_id" ON "public"."device_sessions" USING "btree" ("establishment_id");



CREATE INDEX "idx_device_sessions_is_active" ON "public"."device_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_device_sessions_last_activity" ON "public"."device_sessions" USING "btree" ("last_activity");



CREATE INDEX "idx_device_sessions_orga_user_id" ON "public"."device_sessions" USING "btree" ("orga_user_id");



CREATE INDEX "idx_device_sessions_organization_id" ON "public"."device_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_devices_active" ON "public"."devices" USING "btree" ("is_active");



CREATE INDEX "idx_devices_deleted" ON "public"."devices" USING "btree" ("deleted");



CREATE INDEX "idx_devices_device_id" ON "public"."devices" USING "btree" ("serial_number");



CREATE INDEX "idx_devices_device_role" ON "public"."devices" USING "btree" ("device_role");



CREATE INDEX "idx_devices_display" ON "public"."devices" USING "btree" ("display");



CREATE INDEX "idx_devices_establishment_id" ON "public"."devices" USING "btree" ("establishment_id");



CREATE INDEX "idx_devices_establishment_role" ON "public"."devices" USING "btree" ("establishment_id", "device_role");



CREATE INDEX "idx_devices_mods_gin" ON "public"."devices" USING "gin" ("mods");



CREATE INDEX "idx_devices_port_attribue" ON "public"."devices" USING "btree" ("port_attribue") WHERE ("port_attribue" IS NOT NULL);



CREATE INDEX "idx_devices_serial_number" ON "public"."devices" USING "btree" ("serial_number");



CREATE INDEX "idx_devices_status" ON "public"."devices" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_devices_unique_device_id" ON "public"."devices" USING "btree" ("serial_number") WHERE ("deleted" = false);



CREATE UNIQUE INDEX "idx_devices_unique_establishment" ON "public"."devices" USING "btree" ("establishment_id", "serial_number") WHERE ("deleted" = false);



CREATE INDEX "idx_email_logs_booking_id" ON "public"."email_logs" USING "btree" ("booking_id");



CREATE INDEX "idx_email_logs_recipient" ON "public"."email_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_logs_sent_at" ON "public"."email_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_establishment_gallery_display_order" ON "public"."establishment_gallery" USING "btree" ("display_order");



CREATE INDEX "idx_establishment_gallery_establishment_id" ON "public"."establishment_gallery" USING "btree" ("establishment_id");



CREATE INDEX "idx_establishment_gallery_featured" ON "public"."establishment_gallery" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_establishment_gallery_organization_id" ON "public"."establishment_gallery" USING "btree" ("organization_id");



CREATE INDEX "idx_establishment_gallery_public" ON "public"."establishment_gallery" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_establishments_deleted" ON "public"."establishments" USING "btree" ("deleted");



CREATE INDEX "idx_establishments_org_public" ON "public"."establishments" USING "btree" ("organization_id", "is_public") WHERE ("deleted" = false);



CREATE INDEX "idx_establishments_organization_id" ON "public"."establishments" USING "btree" ("organization_id");



CREATE INDEX "idx_establishments_printer_id" ON "public"."establishments" USING "btree" ("printer_id");



CREATE INDEX "idx_establishments_public" ON "public"."establishments" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_establishments_slug" ON "public"."establishments" USING "btree" ("slug");



CREATE INDEX "idx_formula_products_deleted" ON "public"."formula_products" USING "btree" ("deleted");



CREATE INDEX "idx_formula_products_establishment_id" ON "public"."formula_products" USING "btree" ("establishment_id");



CREATE INDEX "idx_formula_products_formula_id" ON "public"."formula_products" USING "btree" ("formula_id");



CREATE INDEX "idx_formula_products_is_active" ON "public"."formula_products" USING "btree" ("is_active");



CREATE INDEX "idx_formula_products_organization_id" ON "public"."formula_products" USING "btree" ("organization_id");



CREATE INDEX "idx_formula_products_product_id" ON "public"."formula_products" USING "btree" ("product_id");



CREATE INDEX "idx_formula_products_slot_id" ON "public"."formula_products" USING "btree" ("slot_id");



CREATE INDEX "idx_formula_slots_deleted" ON "public"."formula_slots" USING "btree" ("deleted");



CREATE INDEX "idx_formula_slots_establishment_id" ON "public"."formula_slots" USING "btree" ("establishment_id");



CREATE INDEX "idx_formula_slots_formula_id" ON "public"."formula_slots" USING "btree" ("formula_id");



CREATE INDEX "idx_formula_slots_organization_id" ON "public"."formula_slots" USING "btree" ("organization_id");



CREATE INDEX "idx_formula_slots_slot_order" ON "public"."formula_slots" USING "btree" ("slot_order");



CREATE INDEX "idx_formulas_deleted" ON "public"."formulas" USING "btree" ("deleted");



CREATE INDEX "idx_formulas_display_order" ON "public"."formulas" USING "btree" ("display_order");



CREATE INDEX "idx_formulas_is_active" ON "public"."formulas" USING "btree" ("is_active");



CREATE INDEX "idx_formulas_menu_id" ON "public"."formulas" USING "btree" ("menu_id");



CREATE INDEX "idx_formulas_organization_id" ON "public"."formulas" USING "btree" ("organization_id");



CREATE INDEX "idx_gallery_sections_display_order" ON "public"."establishment_gallery_sections" USING "btree" ("display_order");



CREATE INDEX "idx_gallery_sections_establishment_id" ON "public"."establishment_gallery_sections" USING "btree" ("establishment_id");



CREATE INDEX "idx_gallery_sections_establishment_section" ON "public"."establishment_gallery_sections" USING "btree" ("establishment_id", "section", "display_order");



CREATE INDEX "idx_gallery_sections_organization_id" ON "public"."establishment_gallery_sections" USING "btree" ("organization_id");



CREATE INDEX "idx_gallery_sections_section" ON "public"."establishment_gallery_sections" USING "btree" ("section");



CREATE INDEX "idx_menus_deleted" ON "public"."menus" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_menus_establishment" ON "public"."menus" USING "btree" ("establishment_id", "is_active") WHERE (("deleted" IS NULL) AND ("establishment_id" IS NOT NULL));



CREATE INDEX "idx_menus_org_type" ON "public"."menus" USING "btree" ("organization_id", "type", "is_active") WHERE ("deleted" IS NULL);



CREATE INDEX "idx_menus_organization_id" ON "public"."menus" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_deleted" ON "public"."menus_products" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_menus_products_establishment_id" ON "public"."menus_products" USING "btree" ("establishment_id");



CREATE INDEX "idx_menus_products_menu_product" ON "public"."menus_products" USING "btree" ("menus_id", "products_id");



CREATE INDEX "idx_menus_products_organization" ON "public"."menus_products" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_organization_id" ON "public"."menus_products" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_price_history_mp_effective" ON "public"."menus_products_price_history" USING "btree" ("menus_products_id", "effective_from" DESC);



CREATE INDEX "idx_messages_deleted" ON "public"."messages" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_messages_organization_id" ON "public"."messages" USING "btree" ("organization_id");



CREATE INDEX "idx_mobile_user_permissions_deleted" ON "public"."mobile_user_permissions" USING "btree" ("deleted");



CREATE INDEX "idx_mobile_user_permissions_establishment_id" ON "public"."mobile_user_permissions" USING "btree" ("establishment_id");



CREATE INDEX "idx_mobile_user_permissions_mobile_user_id" ON "public"."mobile_user_permissions" USING "btree" ("mobile_user_id");



CREATE INDEX "idx_mobile_user_permissions_organization_id" ON "public"."mobile_user_permissions" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_mobile_user_permissions_unique" ON "public"."mobile_user_permissions" USING "btree" ("mobile_user_id", "permission", "organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_nf525_jet_code" ON "public"."nf525_jet" USING "btree" ("code_event");



CREATE INDEX "idx_nf525_jet_event_at" ON "public"."nf525_jet" USING "btree" ("event_at");



CREATE INDEX "idx_nf525_jet_purgeable" ON "public"."nf525_jet" USING "btree" ("purgeable");



CREATE INDEX "idx_nf525_pieces_est_device" ON "public"."nf525_pieces" USING "btree" ("establishment_id", "device_id");



CREATE INDEX "idx_nf525_pieces_mobile_user_id" ON "public"."nf525_pieces" USING "btree" ("mobile_user_id");



CREATE INDEX "idx_nf525_pieces_order" ON "public"."nf525_pieces" USING "btree" ("order_id");



CREATE INDEX "idx_nf525_pieces_recorded_at" ON "public"."nf525_pieces" USING "btree" ("recorded_at");



CREATE INDEX "idx_nf525_recap_piece" ON "public"."nf525_piece_recap_tva" USING "btree" ("nf525_piece_id");



CREATE INDEX "idx_nf525_restitutions_duplicate_of" ON "public"."nf525_restitutions" USING "btree" ("duplicate_of_id");



CREATE INDEX "idx_nf525_restitutions_est_device" ON "public"."nf525_restitutions" USING "btree" ("establishment_id", "device_id");



CREATE INDEX "idx_nf525_restitutions_order" ON "public"."nf525_restitutions" USING "btree" ("order_id");



CREATE INDEX "idx_nf525_restitutions_payment" ON "public"."nf525_restitutions" USING "btree" ("payment_id");



CREATE INDEX "idx_nf525_restitutions_piece" ON "public"."nf525_restitutions" USING "btree" ("nf525_piece_id");



CREATE INDEX "idx_nf525_sequences_est_device" ON "public"."nf525_sequences" USING "btree" ("establishment_id", "device_id");



CREATE INDEX "idx_nf525_signing_keys_org_estab" ON "public"."nf525_signing_keys" USING "btree" ("organization_id", "establishment_id");



CREATE INDEX "idx_opening_hours_day" ON "public"."opening_hours" USING "btree" ("day_of_week");



CREATE INDEX "idx_opening_hours_deleted" ON "public"."opening_hours" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_opening_hours_establishment" ON "public"."opening_hours" USING "btree" ("establishment_id", "organization_id");



CREATE INDEX "idx_opening_hours_exceptions_date" ON "public"."opening_hours_exceptions" USING "btree" ("exception_date");



CREATE INDEX "idx_opening_hours_exceptions_deleted" ON "public"."opening_hours_exceptions" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_order_formulas_establishment_id" ON "public"."order_formulas" USING "btree" ("establishment_id");



CREATE INDEX "idx_order_formulas_formula_id" ON "public"."order_formulas" USING "btree" ("formula_id");



CREATE INDEX "idx_order_formulas_order_id" ON "public"."order_formulas" USING "btree" ("order_id");



CREATE INDEX "idx_order_formulas_organization_id" ON "public"."order_formulas" USING "btree" ("organization_id");



CREATE INDEX "idx_order_payment_settlements_establishment_id" ON "public"."order_payment_settlements" USING "btree" ("establishment_id");



CREATE INDEX "idx_order_payment_settlements_orders_payments_id" ON "public"."order_payment_settlements" USING "btree" ("orders_payments_id") WHERE ("deleted" = false);



CREATE INDEX "idx_order_products_active" ON "public"."order_products" USING "btree" ("establishment_id", "deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_order_products_created_at" ON "public"."order_products" USING "btree" ("created_at");



CREATE INDEX "idx_order_products_establishment_id" ON "public"."order_products" USING "btree" ("establishment_id");



CREATE INDEX "idx_order_products_order_formulas_id" ON "public"."order_products" USING "btree" ("order_formulas_id");



CREATE INDEX "idx_order_products_order_id" ON "public"."order_products" USING "btree" ("order_id");



CREATE INDEX "idx_order_products_organization_id" ON "public"."order_products" USING "btree" ("organization_id");



CREATE INDEX "idx_order_products_product_id" ON "public"."order_products" USING "btree" ("product_id");



CREATE INDEX "idx_order_products_suite_id" ON "public"."order_products" USING "btree" ("suite_id") WHERE ("suite_id" IS NOT NULL);



CREATE INDEX "idx_order_refunds_establishment" ON "public"."order_refunds" USING "btree" ("establishment_id", "refunded_at" DESC);



CREATE INDEX "idx_order_refunds_payment" ON "public"."order_refunds" USING "btree" ("original_payment_id");



CREATE INDEX "idx_order_suites_establishment_id" ON "public"."order_suites" USING "btree" ("establishment_id");



CREATE INDEX "idx_order_suites_order" ON "public"."order_suites" USING "btree" ("order");



CREATE INDEX "idx_order_suites_order_id" ON "public"."order_suites" USING "btree" ("order_id");



CREATE INDEX "idx_order_suites_organization_id" ON "public"."order_suites" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_organization_id" ON "public"."orders" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_payments_organization_id" ON "public"."order_payments" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_payments_rows_organization_id" ON "public"."order_payments_rows" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_server_id" ON "public"."orders" USING "btree" ("server_id");



CREATE INDEX "idx_payment_methods_deleted" ON "public"."payment_methods" USING "btree" ("deleted");



CREATE INDEX "idx_payment_methods_establishment_id" ON "public"."payment_methods" USING "btree" ("establishment_id");



CREATE INDEX "idx_payment_methods_organization_id" ON "public"."payment_methods" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_payment_methods_unique" ON "public"."payment_methods" USING "btree" ("establishment_id", "payment_method_name", "payment_method_type") WHERE ("deleted" = false);



CREATE INDEX "idx_printers_establishment_id" ON "public"."printers" USING "btree" ("establishment_id");



CREATE INDEX "idx_printers_organization_id" ON "public"."printers" USING "btree" ("organization_id");



CREATE INDEX "idx_product_compositions_component" ON "public"."product_compositions" USING "btree" ("component_product_id");



CREATE INDEX "idx_product_compositions_deleted" ON "public"."product_compositions" USING "btree" ("deleted");



CREATE INDEX "idx_product_compositions_establishment" ON "public"."product_compositions" USING "btree" ("establishment_id");



CREATE INDEX "idx_product_compositions_main_product" ON "public"."product_compositions" USING "btree" ("main_product_id");



CREATE INDEX "idx_product_compositions_required" ON "public"."product_compositions" USING "btree" ("is_required") WHERE ("is_required" = true);



CREATE INDEX "idx_product_options_deleted" ON "public"."product_options" USING "btree" ("deleted");



CREATE INDEX "idx_product_options_establishment" ON "public"."product_options" USING "btree" ("establishment_id");



CREATE INDEX "idx_product_options_group" ON "public"."product_options" USING "btree" ("product_id", "option_group");



CREATE INDEX "idx_product_options_price" ON "public"."product_options" USING "btree" ("option_price") WHERE ("option_price" > (0)::numeric);



CREATE INDEX "idx_product_options_product_id" ON "public"."product_options" USING "btree" ("product_id");



CREATE INDEX "idx_product_options_required" ON "public"."product_options" USING "btree" ("is_required") WHERE ("is_required" = true);



CREATE INDEX "idx_product_options_selection_type" ON "public"."product_options" USING "btree" ("selection_type");



CREATE INDEX "idx_product_options_visible" ON "public"."product_options" USING "btree" ("is_visible") WHERE ("is_visible" = true);



CREATE INDEX "idx_product_purchase_price_history_establishment" ON "public"."product_purchase_price_history" USING "btree" ("establishment_id") WHERE ("establishment_id" IS NOT NULL);



CREATE INDEX "idx_product_purchase_price_history_org_product" ON "public"."product_purchase_price_history" USING "btree" ("organization_id", "product_id");



CREATE INDEX "idx_product_purchase_price_history_product_effective" ON "public"."product_purchase_price_history" USING "btree" ("product_id", "effective_from" DESC);



CREATE INDEX "idx_product_stocks_establishment_id" ON "public"."product_stocks" USING "btree" ("establishment_id");



CREATE INDEX "idx_product_stocks_low_stock" ON "public"."product_stocks" USING "btree" ("organization_id", "current_stock") WHERE ("current_stock" <= "low_stock_threshold");



CREATE INDEX "idx_product_stocks_org" ON "public"."product_stocks" USING "btree" ("organization_id");



CREATE INDEX "idx_product_stocks_product_composition" ON "public"."product_stocks" USING "btree" ("product_composition_id");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_category_order" ON "public"."products" USING "btree" ("category_id", "display_order");



CREATE INDEX "idx_products_organization_id" ON "public"."products" USING "btree" ("organization_id");



CREATE INDEX "idx_products_printer_id" ON "public"."products" USING "btree" ("printer_id");



CREATE INDEX "idx_profiles_deleted" ON "public"."profiles" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_profiles_organization_id" ON "public"."profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_rooms_organization_id" ON "public"."rooms" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_movements_date" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stock_movements_deleted" ON "public"."stock_movements" USING "btree" ("deleted");



CREATE INDEX "idx_stock_movements_org" ON "public"."stock_movements" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_movements_reference" ON "public"."stock_movements" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_tables_connections_id" ON "public"."tables" USING "btree" ("tables_connections_id");



CREATE INDEX "idx_tables_connections_organization_id" ON "public"."tables_connections" USING "btree" ("organization_id");



CREATE INDEX "idx_tables_establishment_id" ON "public"."tables" USING "btree" ("establishment_id");



CREATE INDEX "idx_tables_organization_id" ON "public"."tables" USING "btree" ("organization_id");



CREATE INDEX "idx_users_establishment_id" ON "public"."mobile_users" USING "btree" ("establishment_id");



CREATE INDEX "idx_users_is_active" ON "public"."mobile_users" USING "btree" ("is_active");



CREATE INDEX "idx_users_organization_id" ON "public"."mobile_users" USING "btree" ("organization_id");



CREATE INDEX "idx_users_organizations_deleted" ON "public"."users_organizations" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_users_organizations_organization_id" ON "public"."users_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_users_organizations_user_id" ON "public"."users_organizations" USING "btree" ("user_id");



CREATE INDEX "idx_users_role" ON "public"."mobile_users" USING "btree" ("role");



CREATE INDEX "idx_vat_rate_organization_id" ON "public"."vat_rate" USING "btree" ("organization_id");



CREATE INDEX "idx_work_sessions_date" ON "public"."work_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_work_sessions_org" ON "public"."work_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_work_sessions_status" ON "public"."work_sessions" USING "btree" ("status");



CREATE INDEX "menu_schedules_day_of_week_idx" ON "public"."menu_schedules" USING "btree" ("day_of_week");



CREATE INDEX "menu_schedules_menu_id_idx" ON "public"."menu_schedules" USING "btree" ("menu_id");



CREATE INDEX "menu_schedules_organization_id_idx" ON "public"."menu_schedules" USING "btree" ("organization_id");



CREATE INDEX "mobile_users_pin_code_idx" ON "public"."mobile_users" USING "btree" ("pin_code");



CREATE UNIQUE INDEX "product_compositions_unique_main_component_kind_establishment" ON "public"."product_compositions" USING "btree" ("establishment_id", "main_product_id", "component_product_id", "composition_kind") WHERE (COALESCE("deleted", false) = false);



COMMENT ON INDEX "public"."product_compositions_unique_main_component_kind_establishment" IS 'Unicité logique : même ingrédient peut exister en recipe (ex. 2 steaks inclus) et en modifier (steaks supplémentaires), par établissement. Les lignes deleted=true ne participent pas à l''unicité.';



CREATE UNIQUE INDEX "users_organizations_user_unique_active" ON "public"."users_organizations" USING "btree" ("user_id") WHERE (COALESCE("deleted", false) = false);



CREATE OR REPLACE TRIGGER "KEEP_trigger_create_default_payment_methods" AFTER INSERT ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_fn_create_default_payment_methods"();



CREATE OR REPLACE TRIGGER "calculate_stock_quantities_trigger" BEFORE INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_stock_quantities"();



CREATE OR REPLACE TRIGGER "handle_opening_hours_exceptions_times" BEFORE UPDATE ON "public"."opening_hours_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_opening_hours_times" BEFORE UPDATE ON "public"."opening_hours" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_order_suites_updated_at" BEFORE UPDATE ON "public"."order_suites" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."daily_found" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."device_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."formulas" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."order_payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."order_payments_rows" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."printers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."tables" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."tables_connections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times" BEFORE INSERT OR UPDATE ON "public"."vat_rate" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "nf525_after_piece_insert" AFTER INSERT ON "public"."nf525_pieces" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_sync_sequence_on_piece_insert"();



CREATE OR REPLACE TRIGGER "set_updated_at_trigger" BEFORE UPDATE ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_trigger" BEFORE UPDATE ON "public"."menus" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_trigger" BEFORE UPDATE ON "public"."menus_products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_booking_slots_org_check" BEFORE INSERT OR UPDATE ON "public"."booking_slots" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_booking_slots_org_consistency"();



CREATE OR REPLACE TRIGGER "trigger_order_products_updated_at" BEFORE UPDATE ON "public"."order_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_order_products_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_booking_exceptions_updated_at" BEFORE UPDATE ON "public"."booking_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_booking_exceptions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_custom_domains_updated_at" BEFORE UPDATE ON "public"."custom_domains" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_establishment_gallery_updated_at" BEFORE UPDATE ON "public"."establishment_gallery" FOR EACH ROW EXECUTE FUNCTION "public"."update_establishment_gallery_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_gallery_sections_updated_at" BEFORE UPDATE ON "public"."establishment_gallery_sections" FOR EACH ROW EXECUTE FUNCTION "public"."update_gallery_sections_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_menus_products_updated_at" BEFORE UPDATE ON "public"."menus_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_menus_updated_at" BEFORE UPDATE ON "public"."menus" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_opening_hours_exceptions_updated_at" BEFORE UPDATE ON "public"."opening_hours_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_opening_hours_updated_at" BEFORE UPDATE ON "public"."opening_hours" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_users_organizations_updated_at" BEFORE UPDATE ON "public"."users_organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_validate_booking_exception_slots" BEFORE INSERT OR UPDATE ON "public"."booking_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_booking_exception_slots"();



CREATE OR REPLACE TRIGGER "update_category_grid_items_updated_at" BEFORE UPDATE ON "public"."category_grid_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_logs_updated_at" BEFORE UPDATE ON "public"."email_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_logs_updated_at"();



CREATE OR REPLACE TRIGGER "update_establishments_updated_at" BEFORE UPDATE ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_menus_updated_at" BEFORE UPDATE ON "public"."menus" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_stock_trigger" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_stock"();



CREATE OR REPLACE TRIGGER "update_product_stocks_updated_at" BEFORE UPDATE ON "public"."product_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_work_sessions_updated_at" BEFORE UPDATE ON "public"."work_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."booking_slots"
    ADD CONSTRAINT "booking_slots_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."booking_slots"
    ADD CONSTRAINT "booking_slots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");



ALTER TABLE ONLY "public"."booking_table_allocations"
    ADD CONSTRAINT "booking_table_allocations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_slot_id_fkey" FOREIGN KEY ("booking_slot_id") REFERENCES "public"."booking_slots"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_withdrawals"
    ADD CONSTRAINT "cash_withdrawals_daily_found_id_fkey" FOREIGN KEY ("daily_found_id") REFERENCES "public"."daily_found"("id");



ALTER TABLE ONLY "public"."cash_withdrawals"
    ADD CONSTRAINT "cash_withdrawals_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."cash_withdrawals"
    ADD CONSTRAINT "cash_withdrawals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_vat_rate_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "public"."vat_rate"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "public"."category_grid_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_grid_items"
    ADD CONSTRAINT "category_grid_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_found"
    ADD CONSTRAINT "daily_found_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "public"."mobile_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_orga_user_id_fkey" FOREIGN KEY ("orga_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery"
    ADD CONSTRAINT "establishment_gallery_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery"
    ADD CONSTRAINT "establishment_gallery_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_sections_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_sections_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."establishment_gallery"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_products_category_id" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_products"
    ADD CONSTRAINT "formula_products_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."formula_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_slots"
    ADD CONSTRAINT "formula_slots_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_slots"
    ADD CONSTRAINT "formula_slots_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formula_slots"
    ADD CONSTRAINT "formula_slots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formulas"
    ADD CONSTRAINT "formulas_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."formulas"
    ADD CONSTRAINT "formulas_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formulas"
    ADD CONSTRAINT "formulas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_schedules"
    ADD CONSTRAINT "menu_schedules_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_schedules"
    ADD CONSTRAINT "menu_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_establishments_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_menus_id_fkey" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."menus_products_price_history"
    ADD CONSTRAINT "menus_products_price_history_menus_products_id_fkey" FOREIGN KEY ("menus_products_id") REFERENCES "public"."menus_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_products_id_fkey" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."mobile_user_permissions"
    ADD CONSTRAINT "mobile_user_permissions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mobile_user_permissions"
    ADD CONSTRAINT "mobile_user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mobile_user_permissions"
    ADD CONSTRAINT "mobile_user_permissions_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "public"."mobile_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mobile_user_permissions"
    ADD CONSTRAINT "mobile_user_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nf525_jet"
    ADD CONSTRAINT "nf525_jet_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."nf525_jet"
    ADD CONSTRAINT "nf525_jet_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_jet"
    ADD CONSTRAINT "nf525_jet_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."nf525_piece_recap_tva"
    ADD CONSTRAINT "nf525_piece_recap_tva_nf525_piece_id_fkey" FOREIGN KEY ("nf525_piece_id") REFERENCES "public"."nf525_pieces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "public"."mobile_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."nf525_pieces"
    ADD CONSTRAINT "nf525_pieces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."nf525_restitutions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_nf525_piece_id_fkey" FOREIGN KEY ("nf525_piece_id") REFERENCES "public"."nf525_pieces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."nf525_restitutions"
    ADD CONSTRAINT "nf525_restitutions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."order_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nf525_sequences"
    ADD CONSTRAINT "nf525_sequences_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."nf525_sequences"
    ADD CONSTRAINT "nf525_sequences_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_sequences"
    ADD CONSTRAINT "nf525_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."nf525_signing_keys"
    ADD CONSTRAINT "nf525_signing_keys_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_signing_keys"
    ADD CONSTRAINT "nf525_signing_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."opening_hours_exceptions"
    ADD CONSTRAINT "opening_hours_exceptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."opening_hours_exceptions"
    ADD CONSTRAINT "opening_hours_exceptions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_formulas"
    ADD CONSTRAINT "order_formulas_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id");



ALTER TABLE ONLY "public"."order_formulas"
    ADD CONSTRAINT "order_formulas_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_orders_payments_id_fkey" FOREIGN KEY ("orders_payments_id") REFERENCES "public"."order_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_order_products_id_fkey" FOREIGN KEY ("order_products_id") REFERENCES "public"."order_products"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_order_formulas_id_fkey" FOREIGN KEY ("order_formulas_id") REFERENCES "public"."order_formulas"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "public"."order_suites"("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."order_refunds"
    ADD CONSTRAINT "order_refunds_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "public"."order_payments"("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_daily_found_id_fkey" FOREIGN KEY ("daily_found_id") REFERENCES "public"."daily_found"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "orders_payments_order_id_fkey" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "orders_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "orders_payments_rows_orders_payments_id_fkey" FOREIGN KEY ("orders_payments_id") REFERENCES "public"."order_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "orders_payments_rows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."mobile_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_tables_id_fkey" FOREIGN KEY ("tables_id") REFERENCES "public"."tables"("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_main_product_id_fkey" FOREIGN KEY ("main_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_purchase_price_history"
    ADD CONSTRAINT "product_purchase_price_history_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_purchase_price_history"
    ADD CONSTRAINT "product_purchase_price_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."product_purchase_price_history"
    ADD CONSTRAINT "product_purchase_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_product_composition_id_fkey" FOREIGN KEY ("product_composition_id") REFERENCES "public"."product_compositions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vat_rate_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "public"."vat_rate"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tables_connections"
    ADD CONSTRAINT "tables_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_tables_connections_id_fkey" FOREIGN KEY ("tables_connections_id") REFERENCES "public"."tables_connections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mobile_users"
    ADD CONSTRAINT "users_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mobile_users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vat_rate"
    ADD CONSTRAINT "vat_rate_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."vat_rate"
    ADD CONSTRAINT "vat_rate_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE "public"."actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "actions_delete_universal" ON "public"."actions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "actions_insert_universal" ON "public"."actions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "actions_select_universal" ON "public"."actions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "actions_update_universal" ON "public"."actions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."booking_exceptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_exceptions_delete_universal" ON "public"."booking_exceptions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_exceptions_insert_universal" ON "public"."booking_exceptions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_exceptions_public_read" ON "public"."booking_exceptions" FOR SELECT TO "anon" USING ((("deleted" = false) OR ("deleted" IS NULL)));



CREATE POLICY "booking_exceptions_select_universal" ON "public"."booking_exceptions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_exceptions_update_universal" ON "public"."booking_exceptions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."booking_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_slots_delete_universal" ON "public"."booking_slots" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_slots_insert_universal" ON "public"."booking_slots" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_slots_public_read" ON "public"."booking_slots" FOR SELECT USING ((("is_active" = true) AND ("deleted" = false)));



CREATE POLICY "booking_slots_select_universal" ON "public"."booking_slots" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "booking_slots_update_universal" ON "public"."booking_slots" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."booking_table_allocations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_delete_universal" ON "public"."bookings" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "bookings_insert_anon" ON "public"."bookings" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "bookings_insert_universal" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "bookings_select_universal" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "bookings_update_universal" ON "public"."bookings" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "bta_delete_universal" ON "public"."booking_table_allocations" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "bta_insert_universal" ON "public"."booking_table_allocations" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "bta_select_universal" ON "public"."booking_table_allocations" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "bta_update_universal" ON "public"."booking_table_allocations" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



ALTER TABLE "public"."cash_withdrawals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_withdrawals_delete_universal" ON "public"."cash_withdrawals" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "cash_withdrawals_insert_universal" ON "public"."cash_withdrawals" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "cash_withdrawals_select_universal" ON "public"."cash_withdrawals" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "cash_withdrawals_update_universal" ON "public"."cash_withdrawals" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_universal" ON "public"."categories" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "categories_insert_universal" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "categories_public_read" ON "public"."categories" FOR SELECT USING (("deleted" = false));



CREATE POLICY "categories_select_universal" ON "public"."categories" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "categories_update_universal" ON "public"."categories" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."category_grid_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_grid_items_delete_universal" ON "public"."category_grid_items" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "category_grid_items_insert_universal" ON "public"."category_grid_items" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "category_grid_items_select_universal" ON "public"."category_grid_items" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "category_grid_items_update_universal" ON "public"."category_grid_items" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."custom_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_domains_delete_universal" ON "public"."custom_domains" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "custom_domains_insert_universal" ON "public"."custom_domains" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "custom_domains_public_read" ON "public"."custom_domains" FOR SELECT USING ((("is_active" = true) AND ("deleted" = false)));



CREATE POLICY "custom_domains_select_universal" ON "public"."custom_domains" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "custom_domains_update_universal" ON "public"."custom_domains" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."daily_found" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_found_delete_universal" ON "public"."daily_found" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "daily_found_insert_universal" ON "public"."daily_found" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "daily_found_select_universal" ON "public"."daily_found" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "daily_found_update_universal" ON "public"."daily_found" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_sessions_delete_universal" ON "public"."device_sessions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "device_sessions_insert_universal" ON "public"."device_sessions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "device_sessions_select_universal" ON "public"."device_sessions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "device_sessions_update_universal" ON "public"."device_sessions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "devices_delete_universal" ON "public"."devices" FOR DELETE TO "authenticated" USING (("establishment_id" IN ( SELECT "establishments"."id"
   FROM ("public"."establishments"
     JOIN "public"."users_organizations" ON (("establishments"."organization_id" = "users_organizations"."organization_id")))
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false) AND ("establishments"."deleted" = false)))));



CREATE POLICY "devices_insert_universal" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (("establishment_id" IN ( SELECT "establishments"."id"
   FROM ("public"."establishments"
     JOIN "public"."users_organizations" ON (("establishments"."organization_id" = "users_organizations"."organization_id")))
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false) AND ("establishments"."deleted" = false)))));



CREATE POLICY "devices_select_universal" ON "public"."devices" FOR SELECT TO "authenticated" USING (("establishment_id" IN ( SELECT "establishments"."id"
   FROM ("public"."establishments"
     JOIN "public"."users_organizations" ON (("establishments"."organization_id" = "users_organizations"."organization_id")))
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false) AND ("establishments"."deleted" = false)))));



CREATE POLICY "devices_update_universal" ON "public"."devices" FOR UPDATE TO "authenticated" USING (("establishment_id" IN ( SELECT "establishments"."id"
   FROM ("public"."establishments"
     JOIN "public"."users_organizations" ON (("establishments"."organization_id" = "users_organizations"."organization_id")))
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false) AND ("establishments"."deleted" = false))))) WITH CHECK (("establishment_id" IN ( SELECT "establishments"."id"
   FROM ("public"."establishments"
     JOIN "public"."users_organizations" ON (("establishments"."organization_id" = "users_organizations"."organization_id")))
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false) AND ("establishments"."deleted" = false)))));



ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_logs_delete_universal" ON "public"."email_logs" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "email_logs_insert_policy" ON "public"."email_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "email_logs_insert_universal" ON "public"."email_logs" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "email_logs_select_universal" ON "public"."email_logs" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "email_logs_update_universal" ON "public"."email_logs" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."establishment_gallery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."establishment_gallery_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."establishments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishments_delete_universal" ON "public"."establishments" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "establishments_insert_universal" ON "public"."establishments" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "establishments_public_read" ON "public"."establishments" FOR SELECT USING (("deleted" = false));



CREATE POLICY "establishments_select_universal" ON "public"."establishments" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "establishments_update_universal" ON "public"."establishments" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."formula_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formula_products_delete_universal" ON "public"."formula_products" FOR DELETE TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_products_insert_universal" ON "public"."formula_products" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_products_select_universal" ON "public"."formula_products" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_products_update_universal" ON "public"."formula_products" FOR UPDATE TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))))))) WITH CHECK ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



ALTER TABLE "public"."formula_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formula_slots_delete_universal" ON "public"."formula_slots" FOR DELETE TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_slots_insert_universal" ON "public"."formula_slots" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_slots_select_universal" ON "public"."formula_slots" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "formula_slots_update_universal" ON "public"."formula_slots" FOR UPDATE TO "authenticated" USING ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))))))) WITH CHECK ((("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))) AND ("establishment_id" IN ( SELECT "establishments"."id"
   FROM "public"."establishments"
  WHERE ("establishments"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



ALTER TABLE "public"."formulas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formulas_delete_universal" ON "public"."formulas" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "formulas_insert_universal" ON "public"."formulas" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "formulas_select_universal" ON "public"."formulas" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "formulas_update_universal" ON "public"."formulas" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "gallery_sections_delete_universal" ON "public"."establishment_gallery_sections" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "gallery_sections_insert_universal" ON "public"."establishment_gallery_sections" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "gallery_sections_select_universal" ON "public"."establishment_gallery_sections" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "gallery_sections_update_universal" ON "public"."establishment_gallery_sections" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."menu_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "menu_schedules_delete_universal" ON "public"."menu_schedules" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menu_schedules_insert_universal" ON "public"."menu_schedules" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menu_schedules_select_universal" ON "public"."menu_schedules" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menu_schedules_update_universal" ON "public"."menu_schedules" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."menus" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "menus_delete_universal" ON "public"."menus" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menus_insert_universal" ON "public"."menus" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."menus_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "menus_products_delete_universal" ON "public"."menus_products" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menus_products_insert_universal" ON "public"."menus_products" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."menus_products_price_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "menus_products_price_history_delete_universal" ON "public"."menus_products_price_history" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."menus_products" "mp"
     JOIN "public"."establishments" "e" ON (("e"."id" = "mp"."establishment_id")))
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("mp"."id" = "menus_products_price_history"."menus_products_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))));



CREATE POLICY "menus_products_price_history_insert_universal" ON "public"."menus_products_price_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."menus_products" "mp"
     JOIN "public"."establishments" "e" ON (("e"."id" = "mp"."establishment_id")))
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("mp"."id" = "menus_products_price_history"."menus_products_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))));



CREATE POLICY "menus_products_price_history_select_universal" ON "public"."menus_products_price_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."menus_products" "mp"
     JOIN "public"."establishments" "e" ON (("e"."id" = "mp"."establishment_id")))
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("mp"."id" = "menus_products_price_history"."menus_products_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))));



CREATE POLICY "menus_products_price_history_update_universal" ON "public"."menus_products_price_history" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."menus_products" "mp"
     JOIN "public"."establishments" "e" ON (("e"."id" = "mp"."establishment_id")))
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("mp"."id" = "menus_products_price_history"."menus_products_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."menus_products" "mp"
     JOIN "public"."establishments" "e" ON (("e"."id" = "mp"."establishment_id")))
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("mp"."id" = "menus_products_price_history"."menus_products_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))));



CREATE POLICY "menus_products_select_public" ON "public"."menus_products" FOR SELECT USING ((("deleted" = false) AND (EXISTS ( SELECT 1
   FROM "public"."menus"
  WHERE (("menus"."id" = "menus_products"."menus_id") AND ("menus"."is_public" = true) AND ("menus"."deleted" = false))))));



CREATE POLICY "menus_products_select_universal" ON "public"."menus_products" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menus_products_update_universal" ON "public"."menus_products" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menus_public_read" ON "public"."menus" FOR SELECT USING ((("deleted" = false) AND ("is_public" = true)));



CREATE POLICY "menus_select_public" ON "public"."menus" FOR SELECT USING ((("is_public" = true) AND ("deleted" = false)));



CREATE POLICY "menus_select_universal" ON "public"."menus" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "menus_update_universal" ON "public"."menus" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete_universal" ON "public"."messages" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "messages_insert_universal" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "messages_select_universal" ON "public"."messages" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "messages_update_universal" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."mobile_user_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mobile_user_permissions_delete_universal" ON "public"."mobile_user_permissions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_user_permissions_insert_universal" ON "public"."mobile_user_permissions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_user_permissions_select_universal" ON "public"."mobile_user_permissions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_user_permissions_update_universal" ON "public"."mobile_user_permissions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."mobile_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mobile_users_delete_universal" ON "public"."mobile_users" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_users_insert_universal" ON "public"."mobile_users" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_users_select_universal" ON "public"."mobile_users" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "mobile_users_update_universal" ON "public"."mobile_users" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."nf525_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_config_delete" ON "public"."nf525_config" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "nf525_config_insert" ON "public"."nf525_config" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "nf525_config_select" ON "public"."nf525_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "nf525_config_update" ON "public"."nf525_config" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."nf525_jet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_jet_delete" ON "public"."nf525_jet" FOR DELETE TO "authenticated" USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))));



CREATE POLICY "nf525_jet_insert" ON "public"."nf525_jet" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))));



CREATE POLICY "nf525_jet_select" ON "public"."nf525_jet" FOR SELECT TO "authenticated" USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))));



CREATE POLICY "nf525_jet_update" ON "public"."nf525_jet" FOR UPDATE TO "authenticated" USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))))) WITH CHECK ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))));



ALTER TABLE "public"."nf525_piece_recap_tva" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nf525_pieces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_pieces_delete" ON "public"."nf525_pieces" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_pieces_insert" ON "public"."nf525_pieces" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_pieces_select" ON "public"."nf525_pieces" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_pieces_update" ON "public"."nf525_pieces" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_recap_delete" ON "public"."nf525_piece_recap_tva" FOR DELETE TO "authenticated" USING ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_recap_insert" ON "public"."nf525_piece_recap_tva" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_recap_select" ON "public"."nf525_piece_recap_tva" FOR SELECT TO "authenticated" USING ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_recap_update" ON "public"."nf525_piece_recap_tva" FOR UPDATE TO "authenticated" USING ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."nf525_restitutions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_restitutions_delete" ON "public"."nf525_restitutions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_restitutions_insert" ON "public"."nf525_restitutions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_restitutions_select" ON "public"."nf525_restitutions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_restitutions_update" ON "public"."nf525_restitutions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."nf525_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_sequences_delete" ON "public"."nf525_sequences" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_sequences_insert" ON "public"."nf525_sequences" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_sequences_select" ON "public"."nf525_sequences" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_sequences_update" ON "public"."nf525_sequences" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."nf525_signing_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_signing_keys_delete" ON "public"."nf525_signing_keys" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_signing_keys_insert" ON "public"."nf525_signing_keys" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_signing_keys_select" ON "public"."nf525_signing_keys" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_signing_keys_update" ON "public"."nf525_signing_keys" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."opening_hours" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opening_hours_delete_universal" ON "public"."opening_hours" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."opening_hours_exceptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opening_hours_exceptions_delete_universal" ON "public"."opening_hours_exceptions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_exceptions_insert_universal" ON "public"."opening_hours_exceptions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_exceptions_public_read" ON "public"."opening_hours_exceptions" FOR SELECT USING (("deleted" = false));



CREATE POLICY "opening_hours_exceptions_select_universal" ON "public"."opening_hours_exceptions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_exceptions_update_universal" ON "public"."opening_hours_exceptions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_insert_universal" ON "public"."opening_hours" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_public_read" ON "public"."opening_hours" FOR SELECT USING (("deleted" = false));



CREATE POLICY "opening_hours_select_universal" ON "public"."opening_hours" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "opening_hours_update_universal" ON "public"."opening_hours" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."order_formulas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_formulas_delete_universal" ON "public"."order_formulas" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_formulas_insert_universal" ON "public"."order_formulas" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_formulas_select_universal" ON "public"."order_formulas" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_formulas_update_universal" ON "public"."order_formulas" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."order_payment_settlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payment_settlements_delete_universal" ON "public"."order_payment_settlements" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_settlements_insert_universal" ON "public"."order_payment_settlements" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_settlements_select_universal" ON "public"."order_payment_settlements" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_settlements_update_universal" ON "public"."order_payment_settlements" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."order_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_payments_rows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_products_delete_universal" ON "public"."order_products" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_products_insert_universal" ON "public"."order_products" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_products_select_universal" ON "public"."order_products" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_products_update_universal" ON "public"."order_products" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."order_refunds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_refunds_insert" ON "public"."order_refunds" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_refunds_select" ON "public"."order_refunds" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_refunds_update" ON "public"."order_refunds" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."order_suites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_suites_delete_universal" ON "public"."order_suites" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_suites_insert_universal" ON "public"."order_suites" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_suites_select_universal" ON "public"."order_suites" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "order_suites_update_universal" ON "public"."order_suites" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete_universal" ON "public"."orders" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_insert_universal" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_delete_universal" ON "public"."order_payments" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_insert_universal" ON "public"."order_payments" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_rows_delete_universal" ON "public"."order_payments_rows" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_rows_insert_universal" ON "public"."order_payments_rows" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_rows_select_universal" ON "public"."order_payments_rows" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_rows_update_universal" ON "public"."order_payments_rows" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_select_universal" ON "public"."order_payments" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_payments_update_universal" ON "public"."order_payments" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_select_universal" ON "public"."orders" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "orders_update_universal" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "org_admin_gallery_management" ON "public"."establishment_gallery" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_delete_authenticated" ON "public"."organizations" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "organizations_delete_universal" ON "public"."organizations" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organizations_insert_authenticated" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "organizations_insert_universal" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (("id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organizations_select_authenticated" ON "public"."organizations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "organizations_select_universal" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organizations_update_authenticated" ON "public"."organizations" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "organizations_update_universal" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_delete_universal" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "payment_methods_insert_universal" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "payment_methods_select_universal" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "payment_methods_update_universal" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."printers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "printers_delete_universal" ON "public"."printers" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "printers_insert_universal" ON "public"."printers" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "printers_select_universal" ON "public"."printers" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "printers_update_universal" ON "public"."printers" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."product_compositions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_compositions_delete_universal" ON "public"."product_compositions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_compositions_insert_universal" ON "public"."product_compositions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_compositions_select_universal" ON "public"."product_compositions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_compositions_update_universal" ON "public"."product_compositions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."product_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_options_delete_universal" ON "public"."product_options" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_options_insert_universal" ON "public"."product_options" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_options_select_universal" ON "public"."product_options" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_options_update_universal" ON "public"."product_options" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."product_purchase_price_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_purchase_price_history_delete_universal" ON "public"."product_purchase_price_history" FOR DELETE TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))) AND (("establishment_id" IS NULL) OR ("establishment_id" IN ( SELECT "e"."id"
   FROM ("public"."establishments" "e"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))))));



CREATE POLICY "product_purchase_price_history_insert_universal" ON "public"."product_purchase_price_history" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))) AND (("establishment_id" IS NULL) OR ("establishment_id" IN ( SELECT "e"."id"
   FROM ("public"."establishments" "e"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))))));



CREATE POLICY "product_purchase_price_history_select_universal" ON "public"."product_purchase_price_history" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))) AND (("establishment_id" IS NULL) OR ("establishment_id" IN ( SELECT "e"."id"
   FROM ("public"."establishments" "e"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))))));



CREATE POLICY "product_purchase_price_history_update_universal" ON "public"."product_purchase_price_history" FOR UPDATE TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))) AND (("establishment_id" IS NULL) OR ("establishment_id" IN ( SELECT "e"."id"
   FROM ("public"."establishments" "e"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false))))))) WITH CHECK ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))) AND (("establishment_id" IS NULL) OR ("establishment_id" IN ( SELECT "e"."id"
   FROM ("public"."establishments" "e"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "e"."organization_id")))
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("e"."deleted" = false)))))));



ALTER TABLE "public"."product_stocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_stocks_delete_universal" ON "public"."product_stocks" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_stocks_insert_universal" ON "public"."product_stocks" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_stocks_select_universal" ON "public"."product_stocks" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "product_stocks_update_universal" ON "public"."product_stocks" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_universal" ON "public"."products" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "products_insert_universal" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "products_public_read" ON "public"."products" FOR SELECT USING (("deleted" = false));



CREATE POLICY "products_select_universal" ON "public"."products" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "products_update_universal" ON "public"."products" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_all_auth" ON "public"."profiles" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "public_gallery_read" ON "public"."establishment_gallery" FOR SELECT USING ((("is_public" = true) AND ("deleted" = false)));



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_delete_universal" ON "public"."rooms" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "rooms_insert_universal" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "rooms_select_universal" ON "public"."rooms" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "rooms_update_universal" ON "public"."rooms" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_movements_delete_universal" ON "public"."stock_movements" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "stock_movements_insert_universal" ON "public"."stock_movements" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "stock_movements_select_universal" ON "public"."stock_movements" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "stock_movements_update_universal" ON "public"."stock_movements" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "system_admin_gallery_access" ON "public"."establishment_gallery" USING (true);



CREATE POLICY "system_admin_gallery_sections_access" ON "public"."establishment_gallery_sections" USING (true);



ALTER TABLE "public"."tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tables_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tables_connections_delete_universal" ON "public"."tables_connections" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_connections_insert_universal" ON "public"."tables_connections" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_connections_select_universal" ON "public"."tables_connections" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_connections_update_universal" ON "public"."tables_connections" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_delete_universal" ON "public"."tables" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_insert_universal" ON "public"."tables" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_select_universal" ON "public"."tables" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "tables_update_universal" ON "public"."tables" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."users_organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_organizations_all_service_role" ON "public"."users_organizations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "users_organizations_delete_admin" ON "public"."users_organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("users"."raw_user_meta_data" ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'org_admin'::"text"]))))));



CREATE POLICY "users_organizations_insert_admin" ON "public"."users_organizations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("users"."raw_user_meta_data" ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'org_admin'::"text"]))))));



CREATE POLICY "users_organizations_select_own" ON "public"."users_organizations" FOR SELECT TO "authenticated" USING (("user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"));



CREATE POLICY "users_organizations_update_own" ON "public"."users_organizations" FOR UPDATE TO "authenticated" USING (("user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")) WITH CHECK (("user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"));



ALTER TABLE "public"."vat_rate" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vat_rate_delete_universal" ON "public"."vat_rate" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "vat_rate_insert_universal" ON "public"."vat_rate" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "vat_rate_select_universal" ON "public"."vat_rate" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "vat_rate_update_universal" ON "public"."vat_rate" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."work_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_sessions_delete_universal" ON "public"."work_sessions" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "work_sessions_insert_universal" ON "public"."work_sessions" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "work_sessions_select_universal" ON "public"."work_sessions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "work_sessions_update_universal" ON "public"."work_sessions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT ALL ON FUNCTION "public"."add_stock_movement"("p_product_id" "uuid", "p_organization_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_notes" "text", "p_work_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_stock_movement"("p_product_id" "uuid", "p_organization_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_notes" "text", "p_work_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_stock_movement"("p_product_id" "uuid", "p_organization_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_notes" "text", "p_work_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_stock_quantities"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_stock_quantities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_stock_quantities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphaned_gallery_images"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_gallery_images"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_gallery_images"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_payment_methods_for_establishment"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_payment_methods_for_establishment"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_payment_methods_for_establishment"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_booking_slots_org_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_booking_slots_org_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_booking_slots_org_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_self_product_composition"("p_product_id" "uuid", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_self_product_composition"("p_product_id" "uuid", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_self_product_composition"("p_product_id" "uuid", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_15min_slots"("p_establishment_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_15min_slots"("p_establishment_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_15min_slots"("p_establishment_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slots_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slots_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slots_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_exceptions_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_exceptions_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_exceptions_for_date"("p_establishment_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_menus_by_time"("p_organization_id" "uuid", "p_current_time" time without time zone, "p_establishment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_menus_by_time"("p_organization_id" "uuid", "p_current_time" time without time zone, "p_establishment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_menus_by_time"("p_organization_id" "uuid", "p_current_time" time without time zone, "p_establishment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_slots_simple"("p_establishment_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_slots_simple"("p_establishment_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_slots_simple"("p_establishment_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_stock"("p_product_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_stock"("p_product_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_stock"("p_product_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_establishment_gallery_images"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_establishment_gallery_images"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_establishment_gallery_images"("p_establishment_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_establishment_gallery_section_images"("p_establishment_id" "uuid", "p_section" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_establishment_gallery_section_images"("p_establishment_id" "uuid", "p_section" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_establishment_gallery_section_images"("p_establishment_id" "uuid", "p_section" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gallery_image_url"("p_organization_id" "uuid", "p_establishment_id" "uuid", "p_image_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_gallery_image_url"("p_organization_id" "uuid", "p_establishment_id" "uuid", "p_image_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gallery_image_url"("p_organization_id" "uuid", "p_establishment_id" "uuid", "p_image_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_menu_products"("p_menu_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_menu_products"("p_menu_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_menu_products"("p_menu_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_nf525_piece_number"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_alerts"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_alerts"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_alerts"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_products_categories_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_products_categories_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_products_categories_times"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_times"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hard_delete_record"("table_name" "text", "record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."hard_delete_record"("table_name" "text", "record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hard_delete_record"("table_name" "text", "record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_slot_closed_by_exception"("p_establishment_id" "uuid", "p_date" "date", "p_slot_number" integer, "p_booking_slot_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_slot_closed_by_exception"("p_establishment_id" "uuid", "p_date" "date", "p_slot_number" integer, "p_booking_slot_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_slot_closed_by_exception"("p_establishment_id" "uuid", "p_date" "date", "p_slot_number" integer, "p_booking_slot_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer, "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer, "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_nf525_piece_number_range"("p_establishment_id" "uuid", "p_device_id" "uuid", "p_piece_type" "text", "p_count" integer, "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_record"("table_name" "text", "record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_record"("table_name" "text", "record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_record"("table_name" "text", "record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slot_to_time"("slot_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."slot_to_time"("slot_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."slot_to_time"("slot_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_custom_domain"("domain_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_custom_domain"("domain_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_custom_domain"("domain_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_establishment"("est_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_establishment"("est_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_establishment"("est_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_order"("order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_order"("order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_order"("order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_organization"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_organization"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_organization"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_product"("product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_product"("product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_product"("product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_record"("table_name" "text", "record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_record"("table_name" "text", "record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_record"("table_name" "text", "record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_establishment_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_establishment_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_establishment_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_auth_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_auth_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_auth_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_range_to_slots"("start_time" time without time zone, "end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_range_to_slots"("start_time" time without time zone, "end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_range_to_slots"("start_time" time without time zone, "end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."time_to_slot"("time_value" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_to_slot"("time_value" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_to_slot"("time_value" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_fn_create_default_payment_methods"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_fn_create_default_payment_methods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_fn_create_default_payment_methods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unreserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unreserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unreserve_stock"("p_product_id" "uuid", "p_organization_id" "uuid", "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_booking_exceptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_booking_exceptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_booking_exceptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_custom_domains_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_custom_domains_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_custom_domains_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_logs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_logs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_logs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_establishment_gallery_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_establishment_gallery_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_establishment_gallery_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gallery_sections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gallery_sections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gallery_sections_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_products_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_products_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_products_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_booking_exception_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_booking_exception_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_booking_exception_slots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_closed_slots"("slots" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_closed_slots"("slots" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_closed_slots"("slots" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_domain_format"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_domain_format"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_domain_format"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."actions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."actions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."actions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_exceptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_exceptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_exceptions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_slots" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_slots" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_slots" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_table_allocations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_table_allocations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."booking_table_allocations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cash_withdrawals" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cash_withdrawals" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cash_withdrawals" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."categories" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."category_grid_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."category_grid_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."category_grid_items" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_domains" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_domains" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."custom_domains" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_found" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_found" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_found" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_found" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."device_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."device_sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."device_sessions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."devices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."devices" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."devices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishments" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."establishments" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_slots" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_slots" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formula_slots" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formulas" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formulas" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."formulas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_schedules" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_schedules" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_schedules" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."menus" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."menus_products" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products_price_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products_price_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menus_products_price_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."messages" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."messages" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."messages" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."messages" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_user_permissions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_user_permissions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_user_permissions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."mobile_users" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mobile_users" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_piece_recap_tva" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_piece_recap_tva" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_piece_recap_tva" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_pieces" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_pieces" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_pieces" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_restitutions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_restitutions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_restitutions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_sequences" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_sequences" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_sequences" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_signing_keys" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_signing_keys" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_signing_keys" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours_exceptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours_exceptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."opening_hours_exceptions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_formulas" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_formulas" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_formulas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_settlements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_settlements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_settlements" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_payments" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments_rows" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments_rows" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payments_rows" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_payments_rows" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_refunds" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_refunds" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_refunds" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organizations" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."printers" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_options" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_options" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_options" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_purchase_price_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_purchase_price_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_purchase_price_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_stocks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_stocks" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_stocks" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";
GRANT SELECT ON TABLE "public"."products" TO PUBLIC;



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rooms" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tables" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables_connections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables_connections" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tables_connections" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tables_connections" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users_organizations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users_organizations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users_organizations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vat_rate" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vat_rate" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vat_rate" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vat_rate" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."work_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."work_sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."work_sessions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";






RESET ALL;
