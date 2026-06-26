

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


CREATE OR REPLACE FUNCTION "public"."auth_can_access_establishment"("p_org_id" "uuid", "p_est_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    -- bypass system_admin : accès total
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role') = 'system_admin'
    OR
    EXISTS (
      SELECT 1
      FROM public.users_organizations uo
      WHERE uo.user_id = (
              current_setting('request.jwt.claims', true)::json ->> 'sub'
            )::uuid
        AND uo.deleted = false
        AND (
          -- org_admin / commercial : pas d'établissement spécifique
          (uo.establishment_id IS NULL AND uo.organization_id = p_org_id)
          OR
          -- manager : establishment_id doit correspondre
          (uo.establishment_id IS NOT NULL
           AND p_est_id IS NOT NULL
           AND uo.establishment_id = p_est_id)
        )
    )
$$;


ALTER FUNCTION "public"."auth_can_access_establishment"("p_org_id" "uuid", "p_est_id" "uuid") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."fn_fifo_valorize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_qty      numeric;
  v_lot      RECORD;
  v_take     numeric;
  v_cost     numeric := 0;
  v_qty_done numeric := 0;
  v_allocs   jsonb   := '[]'::jsonb;
  v_fallback numeric;
BEGIN

  -- Lot d'achat : initialiser remaining_quantity
  IF NEW.movement_type = 'purchase' THEN
    UPDATE stock_movements
    SET    remaining_quantity = NEW.quantity
    WHERE  id = NEW.id;
    RETURN NEW;
  END IF;

  -- Guard : uniquement sale/restore sans unit_cost
  IF NEW.unit_cost IS NOT NULL
     OR NEW.movement_type NOT IN ('sale', 'restore') THEN
    RETURN NEW;
  END IF;

  -- ── SALE : allocation FIFO ──────────────────────────────────
  IF NEW.movement_type = 'sale' THEN
    v_qty := COALESCE(NEW.quantity_before, 0) - COALESCE(NEW.quantity_after, 0);

    FOR v_lot IN
      SELECT id, remaining_quantity, unit_cost
      FROM   stock_movements
      WHERE  product_stock_id  = NEW.product_stock_id
        AND  movement_type     = 'purchase'
        AND  remaining_quantity > 0
        AND  deleted           = false
      ORDER  BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_qty <= 0;
      v_take     := LEAST(v_lot.remaining_quantity, v_qty);
      UPDATE stock_movements
      SET    remaining_quantity = remaining_quantity - v_take
      WHERE  id = v_lot.id;
      v_allocs   := v_allocs || jsonb_build_object(
                     'lot_id', v_lot.id, 'qty', v_take, 'cost', v_lot.unit_cost);
      v_cost     := v_cost     + v_take * v_lot.unit_cost;
      v_qty_done := v_qty_done + v_take;
      v_qty      := v_qty      - v_take;
    END LOOP;

    -- Lots épuisés : coût de repli + flag
    IF v_qty > 0 THEN
      SELECT unit_cost INTO v_fallback
      FROM   stock_movements
      WHERE  product_stock_id = NEW.product_stock_id
        AND  movement_type    = 'purchase'
        AND  unit_cost        IS NOT NULL
        AND  deleted          = false
      ORDER  BY created_at DESC
      LIMIT  1;

      IF v_fallback IS NOT NULL THEN
        v_cost     := v_cost     + v_qty * v_fallback;
        v_qty_done := v_qty_done + v_qty;
      END IF;

      UPDATE stock_movements SET needs_review = true WHERE id = NEW.id;
    END IF;

    UPDATE stock_movements
    SET unit_cost       = CASE WHEN v_qty_done > 0
                               THEN ROUND(v_cost / v_qty_done, 6)
                               ELSE NULL END,
        lot_allocations = v_allocs
    WHERE  id = NEW.id;

  -- ── RESTORE : contre-passe LIFO ─────────────────────────────
  ELSIF NEW.movement_type = 'restore' THEN

    -- Retrouver les allocations de la vente originale
    SELECT lot_allocations INTO v_allocs
    FROM   stock_movements
    WHERE  reference_id     = NEW.reference_id
      AND  product_stock_id = NEW.product_stock_id
      AND  movement_type    = 'sale'
      AND  lot_allocations  IS NOT NULL
      AND  deleted          = false
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Restore arrivé avant sa vente (offline) → review manuel
    IF v_allocs IS NULL THEN
      UPDATE stock_movements SET needs_review = true WHERE id = NEW.id;
      RETURN NEW;
    END IF;

    v_qty := COALESCE(NEW.quantity_after, 0) - COALESCE(NEW.quantity_before, 0);

    -- LIFO des allocations (reverse order)
    FOR v_lot IN
      SELECT (e->>'lot_id')::uuid  AS lot_id,
             (e->>'qty')::numeric  AS qty,
             (e->>'cost')::numeric AS cost
      FROM   jsonb_array_elements(v_allocs) WITH ORDINALITY t(e, ord)
      ORDER  BY ord DESC
    LOOP
      EXIT WHEN v_qty <= 0;
      v_take     := LEAST(v_lot.qty, v_qty);
      UPDATE stock_movements
      SET    remaining_quantity = remaining_quantity + v_take
      WHERE  id = v_lot.lot_id;
      v_cost     := v_cost     + v_take * v_lot.cost;
      v_qty_done := v_qty_done + v_take;
      v_qty      := v_qty      - v_take;
    END LOOP;

    UPDATE stock_movements
    SET unit_cost    = CASE WHEN v_qty_done > 0
                            THEN ROUND(v_cost / v_qty_done, 6)
                            ELSE NULL END,
        needs_review = (v_qty > 0)
    WHERE  id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_fifo_valorize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lock_stock_unit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Trigger uniquement si l'unité change réellement
  IF OLD.unit IS NOT DISTINCT FROM NEW.unit THEN
    RETURN NEW;
  END IF;

  -- Vérifier qu'aucun lot actif n'existe
  IF EXISTS (
    SELECT 1 FROM stock_movements
    WHERE product_stock_id = NEW.id
      AND movement_type = 'purchase'
      AND remaining_quantity > 0
      AND deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'Impossible de changer l''unité : des lots FIFO actifs existent (remaining_quantity > 0). Soldez le stock avant de changer d''unité.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_lock_stock_unit"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."match_knowledge_base"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "category" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id, title, content, category,
    1 - (embedding <=> query_embedding) AS similarity
  FROM support_knowledge_base
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."match_knowledge_base"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_jet_410_saas"("p_establishment_id" "uuid", "p_organization_id" "uuid", "p_changed_fields" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_signing_key   TEXT;
  v_event_id      BIGINT;
  v_prev_sig      TEXT;
  v_label         TEXT;
  v_ts            TEXT;
  v_chain         TEXT;
  v_sig_b64       TEXT;
  v_sig_b64url    TEXT;
BEGIN
  -- Clé active + verrou de sérialisation : la ligne de clé active existe toujours
  -- (sinon exception ci-dessous), donc FOR UPDATE sérialise tous les 410 SaaS
  -- concurrents d'un même établissement avant la lecture de MAX(event_id)/prev_sig.
  SELECT signing_key_base64
  INTO   v_signing_key
  FROM   public.nf525_signing_keys
  WHERE  establishment_id = p_establishment_id
    AND  valid_to IS NULL
  LIMIT  1
  FOR UPDATE;

  IF v_signing_key IS NULL THEN
    RAISE EXCEPTION 'nf525_jet_410_saas: aucune clé de signature active pour l''établissement %',
      p_establishment_id;
  END IF;

  -- event_id : MAX global de l'établissement + 1 (unicité de la séquence, tous devices).
  SELECT COALESCE(MAX(event_id), 0) + 1
  INTO   v_event_id
  FROM   public.nf525_jet
  WHERE  establishment_id = p_establishment_id;

  -- prev_sig : dernière signature du fil "caisse blanche" (device_id IS NULL).
  -- Chaînage par device (NF525_SIGNATURE_CHAINBRAGE.md). NULL pour le tout premier 410.
  SELECT signature_base64url
  INTO   v_prev_sig
  FROM   public.nf525_jet
  WHERE  establishment_id = p_establishment_id
    AND  device_id IS NULL
  ORDER  BY event_id DESC
  LIMIT  1;

  v_label := 'Changement données assujetti : ' || p_changed_fields;

  -- Horodatage R19 AAAAMMJJHHMMSS. UTC : sans incidence sur la vérification, qui
  -- recalcule le HMAC à partir de hash_chain_input stocké (string auto-cohérente).
  v_ts := to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');

  -- Chaîne R19 §6.3 : eventId,410,label,timestamp,operator,caisse,hasPrev,prevSig
  -- operator (pos 5) et code caisse (pos 6) absents → " " (les deux ", ").
  v_chain := v_event_id::TEXT
    || ',410'
    || ',' || v_label
    || ',' || v_ts
    || ', '
    || ', '
    || ',' || CASE WHEN v_prev_sig IS NOT NULL THEN '1' ELSE '0' END
    || ',' || COALESCE(v_prev_sig, ' ');

  -- HMAC-SHA256(clé décodée base64) → base64 → base64url (sans padding).
  v_sig_b64    := encode(hmac(v_chain::bytea, decode(v_signing_key, 'base64'), 'sha256'), 'base64');
  v_sig_b64url := replace(replace(replace(v_sig_b64, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.nf525_jet (
    id, establishment_id, organization_id, event_id, code_event,
    label, event_at, operator_code, device_id, report_previous_signature,
    previous_signature_base64url, signature_base64url, hash_chain_input,
    purgeable, created_at
  ) VALUES (
    gen_random_uuid(), p_establishment_id, p_organization_id, v_event_id, 410,
    v_label, NOW(), NULL, NULL, NULL,
    v_prev_sig, v_sig_b64url, v_chain, FALSE, NOW()
  );
END;
$$;


ALTER FUNCTION "public"."nf525_jet_410_saas"("p_establishment_id" "uuid", "p_organization_id" "uuid", "p_changed_fields" "text") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."register_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid", "p_device_info" "jsonb" DEFAULT NULL::"jsonb", "p_device_role" "text" DEFAULT 'master'::"text", "p_mods" "text"[] DEFAULT ARRAY['pos'::"text"], "p_display" "text" DEFAULT 'landscape'::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_device devices%ROWTYPE;
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND deleted = false
      AND (establishment_id IS NULL AND organization_id = p_organization_id
           OR establishment_id = p_establishment_id)
  ) INTO v_has_access;
  IF NOT v_has_access THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO v_device FROM devices WHERE serial_number = p_serial_number AND deleted = false;

  IF FOUND THEN
    IF v_device.establishment_id = p_establishment_id THEN
      UPDATE devices SET organization_id = p_organization_id, status = 'active', updated_at = NOW()
      WHERE serial_number = p_serial_number AND deleted = false RETURNING * INTO v_device;
      RETURN json_build_object('status', 'ok', 'device', row_to_json(v_device));
    ELSE
      RETURN json_build_object('status', 'conflict', 'device', NULL, 'current_establishment_id', v_device.establishment_id);
    END IF;
  ELSE
    INSERT INTO devices (serial_number, establishment_id, organization_id, device_info, device_role, mods, display, status)
    VALUES (p_serial_number, p_establishment_id, p_organization_id, p_device_info, p_device_role, p_mods, p_display, 'active')
    RETURNING * INTO v_device;
    RETURN json_build_object('status', 'created', 'device', row_to_json(v_device));
  END IF;
END; $$;


ALTER FUNCTION "public"."register_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid", "p_device_info" "jsonb", "p_device_role" "text", "p_mods" "text"[], "p_display" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_device devices%ROWTYPE;
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND deleted = false
      AND (establishment_id IS NULL AND organization_id = p_organization_id
           OR establishment_id = p_establishment_id)
  ) INTO v_has_access;
  IF NOT v_has_access THEN RAISE EXCEPTION 'Access denied'; END IF;

  UPDATE devices SET establishment_id = p_establishment_id, organization_id = p_organization_id,
    status = 'active', updated_at = NOW()
  WHERE serial_number = p_serial_number AND deleted = false RETURNING * INTO v_device;

  IF NOT FOUND THEN RAISE EXCEPTION 'Device not found: %', p_serial_number; END IF;
  RETURN row_to_json(v_device);
END; $$;


ALTER FUNCTION "public"."transfer_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";

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
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
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
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'seated'::"text", 'no_show'::"text"])))
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



CREATE TABLE IF NOT EXISTS "public"."crm_commercial_objectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "target_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "achieved_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_commercial_objectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_onboarding_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Onboarding'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."crm_onboarding_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_onboarding_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_onboarding_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_pre_invoice_installments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pre_invoice_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_pre_invoice_installments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."crm_pre_invoice_installments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."crm_pre_invoice_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."crm_pre_invoice_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_pre_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid",
    "lead_id" "uuid",
    "org_id" "uuid",
    "pre_invoice_number" "text" DEFAULT ((('PF-'::"text" || "to_char"("now"(), 'YYYY'::"text")) || '-'::"text") || "lpad"(("nextval"('"public"."crm_pre_invoice_seq"'::"regclass"))::"text", 4, '0'::"text")) NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "total_ht" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_ttc" numeric(12,2) DEFAULT 0 NOT NULL,
    "commitment_months" integer DEFAULT 12 NOT NULL,
    "mrr" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "deposit_amount" numeric,
    CONSTRAINT "crm_pre_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'partial'::"text", 'complete'::"text"])))
);


ALTER TABLE "public"."crm_pre_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'service'::"text" NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "price_type" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "purchase_price" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "crm_products_category_check" CHECK (("category" = ANY (ARRAY['software'::"text", 'hardware'::"text", 'service'::"text", 'other'::"text"]))),
    CONSTRAINT "crm_products_price_type_check" CHECK (("price_type" = ANY (ARRAY['monthly'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."crm_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "designation" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "price_type" "text" DEFAULT 'one_time'::"text" NOT NULL,
    "total_ht" numeric(12,2) DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "purchase_price" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "crm_quote_items_price_type_check" CHECK (("price_type" = ANY (ARRAY['monthly'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."crm_quote_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."crm_quote_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."crm_quote_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "org_id" "uuid",
    "quote_number" "text" DEFAULT ((('DEV-'::"text" || "to_char"("now"(), 'YYYY'::"text")) || '-'::"text") || "lpad"(("nextval"('"public"."crm_quote_seq"'::"regclass"))::"text", 4, '0'::"text")) NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "vat_rate" numeric(5,2) DEFAULT 20 NOT NULL,
    "total_ht" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_tva" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_ttc" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "sent_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "deposit_amount" numeric,
    "validated_at" timestamp with time zone,
    "validated_by" "uuid",
    "pennylane_quote_id" "text",
    CONSTRAINT "crm_quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_validation'::"text", 'validated'::"text", 'sent'::"text", 'signed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."crm_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "name" "text" NOT NULL,
    "amount_monthly" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "next_billing_date" "date",
    "commitment_months" integer DEFAULT 12 NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "crm_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."crm_subscriptions" OWNER TO "postgres";


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
    "closed_at" timestamp with time zone DEFAULT "now"(),
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
    "device_id" "uuid" NOT NULL,
    "orga_user_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."device_sessions" REPLICA IDENTITY FULL;


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
    "mods" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "display" "text" DEFAULT 'portrait'::"text" NOT NULL,
    CONSTRAINT "chk_port_attribue" CHECK ((("port_attribue" IS NULL) OR (("port_attribue" >= 8080) AND ("port_attribue" <= 8090) AND ("port_attribue" <> ALL (ARRAY[8081, 8082]))))),
    CONSTRAINT "devices_device_role_check" CHECK ((("device_role")::"text" = ANY (ARRAY['master'::"text", 'slave'::"text"]))),
    CONSTRAINT "devices_display_check" CHECK (("display" = ANY (ARRAY['landscape'::"text", 'portrait'::"text"]))),
    CONSTRAINT "devices_mods_check" CHECK (("mods" <@ ARRAY['pos'::"text", 'kds'::"text", 'haccp'::"text", 'hr'::"text", 'booking'::"text"]))
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



CREATE TABLE IF NOT EXISTS "public"."doc_import_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_id" "uuid" NOT NULL,
    "field_name" "text",
    "original_value" "text",
    "corrected_value" "text",
    "corrected_by" "uuid",
    "corrected_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."doc_import_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doc_import_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_id" "uuid" NOT NULL,
    "designation" "text",
    "quantite" numeric,
    "unite" "text",
    "prix_unitaire" numeric,
    "total_ht" numeric,
    "reference" "text",
    "supplier_reference_id" "uuid",
    "automation_status" "text",
    "automation_note" "text",
    "product_id" "uuid",
    "apply_price" boolean DEFAULT true NOT NULL,
    "apply_stock" boolean DEFAULT true NOT NULL,
    "applied_at" timestamp with time zone,
    "contenance_unitaire" numeric(12,4),
    "unite_contenance" "text",
    CONSTRAINT "doc_import_lines_automation_status_check" CHECK (("automation_status" = ANY (ARRAY['pending'::"text", 'matched'::"text", 'applied'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."doc_import_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doc_import_usage" (
    "organization_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "doc_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."doc_import_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doc_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "source_url" "text",
    "source_type" "text",
    "doc_type" "text",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "image_hash" "text",
    "extracted_llm" "jsonb",
    "extracted_azure" "jsonb",
    "consensus_json" "jsonb",
    "validated_json" "jsonb",
    "pennylane_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "validated_at" timestamp with time zone,
    "validated_by" "uuid",
    "validation_error" "text",
    "supplier_id" "uuid",
    "automation_applied_at" timestamp with time zone,
    "automation_error" "text",
    "document_date" "date",
    "numero_document" "text",
    "date_echeance" "date",
    "date_livraison" "date",
    "total_ht" numeric,
    "total_ttc" numeric,
    "tva_details" "jsonb"
);


ALTER TABLE "public"."doc_imports" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."employee_absences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "has_document" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "employee_absences_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "employee_absences_type_check" CHECK (("type" = ANY (ARRAY['paid_leave'::"text", 'sick_leave'::"text", 'unpaid_leave'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."employee_absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "issued_at" "date",
    "expires_at" "date",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "employee_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['employment_contract'::"text", 'dpae'::"text", 'sick_leave_certificate'::"text", 'expense_receipt'::"text", 'transport_receipt'::"text", 'id_document'::"text", 'work_permit'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."employee_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_module_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "module" "text" NOT NULL,
    "establishment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "employee_module_access_module_check" CHECK (("module" = ANY (ARRAY['pos'::"text", 'hr'::"text", 'haccp'::"text", 'clients'::"text"])))
);


ALTER TABLE "public"."employee_module_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_monthly_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "comments" "text",
    "hire_mid_month_date" "date",
    "exit_mid_month_date" "date",
    "overtime_week_1" numeric(6,2),
    "overtime_week_2" numeric(6,2),
    "overtime_week_3" numeric(6,2),
    "overtime_week_4" numeric(6,2),
    "overtime_week_5" numeric(6,2),
    "bonus_gross" numeric(10,2),
    "bonus_net" numeric(10,2),
    "meal_vouchers_count" integer,
    "expense_claims" numeric(10,2),
    "advance_payment" numeric(10,2),
    "transport_subsidy" numeric(10,2),
    "other_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "employee_monthly_reports_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."employee_monthly_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "permission" character varying(100) NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "uuid",
    "organization_id" "uuid",
    "establishment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "granted_by_employee_id" "uuid"
);


ALTER TABLE "public"."employee_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_shift_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_shift_id" "uuid" NOT NULL,
    "override_date" "date" NOT NULL,
    "employee_id" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "start_hour" numeric,
    "end_hour" numeric,
    "label" "text",
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_shift_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_shift_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "start_hour" smallint NOT NULL,
    "start_minute" smallint DEFAULT 0 NOT NULL,
    "end_hour" smallint NOT NULL,
    "end_minute" smallint DEFAULT 0 NOT NULL,
    "color" "text",
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_shift_templates_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" <= 26))),
    CONSTRAINT "employee_shift_templates_end_minute_check" CHECK (("end_minute" = ANY (ARRAY[0, 15, 30, 45]))),
    CONSTRAINT "employee_shift_templates_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" <= 23))),
    CONSTRAINT "employee_shift_templates_start_minute_check" CHECK (("start_minute" = ANY (ARRAY[0, 15, 30, 45])))
);


ALTER TABLE "public"."employee_shift_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_shift_template_id" "uuid",
    "label" "text" DEFAULT ''::"text",
    "start_hour" smallint NOT NULL,
    "start_minute" smallint DEFAULT 0 NOT NULL,
    "end_hour" smallint NOT NULL,
    "end_minute" smallint DEFAULT 0 NOT NULL,
    "overnight" boolean DEFAULT false NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurrence_days" smallint[],
    "date_start" "date" NOT NULL,
    "date_end" "date",
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "excluded_dates" "date"[] DEFAULT '{}'::"date"[] NOT NULL,
    CONSTRAINT "employee_shifts_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" <= 26))),
    CONSTRAINT "employee_shifts_end_minute_check" CHECK (("end_minute" = ANY (ARRAY[0, 15, 30, 45]))),
    CONSTRAINT "employee_shifts_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" <= 23))),
    CONSTRAINT "employee_shifts_start_minute_check" CHECK (("start_minute" = ANY (ARRAY[0, 15, 30, 45])))
);


ALTER TABLE "public"."employee_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "firstname" "text" NOT NULL,
    "lastname" "text" NOT NULL,
    "establishment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'server'::character varying,
    "email" character varying(255),
    "phone" character varying(20),
    "is_active" boolean DEFAULT true,
    "pin_code" "text",
    "gender" "text",
    "nationality" "text",
    "birth_date" "date",
    "birth_department" "text",
    "birth_city" "text",
    "social_security_number" "text",
    "nia_number" "text",
    "contract_type" "text",
    "job_title" "text",
    "qualification" "text",
    "hire_datetime" timestamp with time zone,
    "exit_date" "date",
    "gross_salary" numeric(10,2),
    "net_salary" numeric(10,2),
    "work_permit_date" "date",
    "work_permit_type" "text",
    "work_permit_number" "text",
    "temp_agency_name" "text",
    "temp_agency_address" "text",
    "has_mobile_access" boolean DEFAULT false NOT NULL,
    "auth_user_id" "uuid",
    CONSTRAINT "employees_contract_type_check" CHECK (("contract_type" = ANY (ARRAY['cdi'::"text", 'cdd'::"text", 'interim'::"text", 'apprentissage'::"text", 'stagiaire'::"text", 'other'::"text"]))),
    CONSTRAINT "employees_gender_check" CHECK (("gender" = ANY (ARRAY['M'::"text", 'F'::"text", 'other'::"text"]))),
    CONSTRAINT "mobile_users_pin_code_length" CHECK (("length"("pin_code") >= 4)),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['server'::character varying, 'chef'::character varying, 'manager'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON TABLE "public"."employees" IS 'Table optimisée pour l''application mobile - utilisateurs opérationnels avec authentification PIN';



COMMENT ON COLUMN "public"."employees"."role" IS 'Rôle: manager, server, etc.';



COMMENT ON COLUMN "public"."employees"."pin_code" IS 'Code PIN pour l''authentification mobile (min 4 chiffres)';



CREATE TABLE IF NOT EXISTS "public"."establishment_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "issued_at" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "establishment_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['duerp'::"text", 'mandatory_notice'::"text", 'personnel_register_export'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."establishment_documents" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."establishment_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "module" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "seats" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "establishment_modules_module_check" CHECK (("module" = ANY (ARRAY['pos'::"text", 'kds'::"text", 'hr'::"text", 'haccp'::"text", 'booking'::"text"])))
);


ALTER TABLE "public"."establishment_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "slug" character varying(255) NOT NULL,
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



CREATE TABLE IF NOT EXISTS "public"."lead_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "content" "text",
    "duration_minutes" integer,
    "meeting_url" "text",
    "email_to" "text",
    "email_subject" "text",
    "brevo_message_id" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    CONSTRAINT "lead_activities_type_check" CHECK (("type" = ANY (ARRAY['call'::"text", 'email'::"text", 'demo'::"text", 'meeting'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."lead_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "position" "text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."lead_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "due_date" timestamp with time zone,
    "assigned_to" "uuid",
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    CONSTRAINT "lead_tasks_type_check" CHECK (("type" = ANY (ARRAY['call'::"text", 'email'::"text", 'demo'::"text", 'meeting'::"text", 'proposal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."lead_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "city" "text",
    "sector" "text",
    "website" "text",
    "notes" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_details" "text",
    "assigned_to" "uuid",
    "stage_changed_at" timestamp with time zone,
    "converted_org_id" "uuid",
    "converted_at" timestamp with time zone,
    "lost_reason" "text",
    "pennylane_contact_id" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "current_software" "text",
    "employees_count" integer,
    "covers_per_day" integer,
    "photo_url" "text",
    "address" "text",
    "zip_code" "text",
    "country" "text" DEFAULT 'FR'::"text",
    CONSTRAINT "leads_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'csv_import'::"text", 'web_form'::"text", 'inbound_email'::"text", 'referral'::"text", 'webhook'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'demo_scheduled'::"text", 'demo_done'::"text", 'proposal'::"text", 'negotiation'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


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
    "created_by" "uuid"
);


ALTER TABLE "public"."menus" OWNER TO "postgres";


COMMENT ON TABLE "public"."menus" IS 'Table des menus avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."menus"."is_active" IS 'Indique si la carte est active et visible';



COMMENT ON COLUMN "public"."menus"."is_public" IS 'Indique si la carte est visible sur le site web public';



COMMENT ON COLUMN "public"."menus"."display_order" IS 'Ordre d''affichage des cartes';



COMMENT ON COLUMN "public"."menus"."description" IS 'Description de la carte';



COMMENT ON COLUMN "public"."menus"."image_url" IS 'URL de l''image de la carte';



CREATE TABLE IF NOT EXISTS "public"."menus_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "menus_id" "uuid",
    "products_id" "uuid",
    "price" numeric(10,2),
    "organization_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "establishment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
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



CREATE TABLE IF NOT EXISTS "public"."nf525_order_refunds" (
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
    CONSTRAINT "nf525_order_refunds_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."nf525_order_refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_order_refunds" IS 'NF525 R13 : remboursements/avoirs. Chaque ligne génère une pièce justificatif chaînée à la pièce originale.';



COMMENT ON COLUMN "public"."nf525_order_refunds"."original_nf525_piece_signature" IS 'Signature Base64 URL de la pièce NF525 originale — utilisée comme previous_signature du justificatif.';



COMMENT ON COLUMN "public"."nf525_order_refunds"."refund_method" IS 'cash | card | cheque | other';



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
    "employee_id" "uuid" NOT NULL,
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
    "vat_details" "jsonb",
    CONSTRAINT "nf525_restitutions_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['ticket'::"text", 'note_de_frais'::"text", 'justificatif'::"text"])))
);


ALTER TABLE "public"."nf525_restitutions" OWNER TO "postgres";


COMMENT ON TABLE "public"."nf525_restitutions" IS 'Journal des restitutions imprimées (ticket, note de frais) : original/duplicata, montant TTC, couverts, consommation remboursement.';



COMMENT ON COLUMN "public"."nf525_restitutions"."vat_details" IS 'Ventilation TVA par taux au moment de l''impression (snapshot). Null pour les anciennes restitutions.';



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



CREATE TABLE IF NOT EXISTS "public"."order_payment_pools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "pool_type" "text" NOT NULL,
    "product_keys" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "n_shares" integer NOT NULL,
    "label" "text",
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_payment_pools_n_shares_check" CHECK (("n_shares" > 0)),
    CONSTRAINT "order_payment_pools_pool_type_check" CHECK (("pool_type" = ANY (ARRAY['group_a'::"text", 'group_c'::"text"])))
);


ALTER TABLE "public"."order_payment_pools" OWNER TO "postgres";


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
    "establishment_id" "uuid" NOT NULL,
    "division_state" "jsonb",
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_reason" "text",
    "order_discount_share" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "order_payments_discount_amount_nonneg" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "order_payments_order_discount_share_nonneg" CHECK (("order_discount_share" >= (0)::numeric))
);

ALTER TABLE ONLY "public"."order_payments" REPLICA IDENTITY FULL;


ALTER TABLE "public"."order_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payments" IS 'Table des paiements de commandes avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."order_payments"."division_state" IS 'État de division de la note. NULL = individuel (mode par défaut).
   Structure : {
     "mode": "group_a" | "group_c",
     "groupId": "uuid",   -- lie les notes d un même groupe A ou C entre elles
     "n": 3               -- nb de membres dans ce groupe au moment de la création
   }';



COMMENT ON COLUMN "public"."order_payments"."discount_amount" IS 'Remise TTC déduite du total de la note. Montant payé = total_parts - discount_amount.';



COMMENT ON COLUMN "public"."order_payments"."discount_reason" IS 'Motif de la remise (optionnel). Tracé dans le JET NF525 code 323/328.';



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
    "order_products_id" "uuid",
    "pool_id" "uuid"
);

ALTER TABLE ONLY "public"."order_payments_rows" REPLICA IDENTITY FULL;


ALTER TABLE "public"."order_payments_rows" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payments_rows" IS 'Table des lignes de paiements avec ID UUID généré automatiquement';



CREATE TABLE IF NOT EXISTS "public"."order_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
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
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_reason" "text",
    "late_addition" boolean DEFAULT false NOT NULL,
    CONSTRAINT "order_products_discount_amount_nonneg" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "order_products_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_products_total_price_check" CHECK (("total_price" >= (0)::numeric)),
    CONSTRAINT "order_products_unit_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "order_products_vat_rate_check" CHECK ((("vat_rate" >= (0)::numeric) AND ("vat_rate" <= (100)::numeric)))
);

ALTER TABLE ONLY "public"."order_products" REPLICA IDENTITY FULL;


ALTER TABLE "public"."order_products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_products"."kitchen_sent_at" IS 'Horodatage du premier envoi de la ligne en cuisine (NULL = jamais envoyée).';



COMMENT ON COLUMN "public"."order_products"."kitchen_print_count" IS 'Nombre de fois où la ligne a été envoyée / imprimée pour la cuisine.';



COMMENT ON COLUMN "public"."order_products"."cancelled" IS 'Indique si la ligne a été annulée (true) au lieu d''être réellement supprimée.';



COMMENT ON COLUMN "public"."order_products"."cancel_reason" IS 'Motif d''annulation de la ligne (ex. erreur de saisie, article indisponible, annulation client).';



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
    "deleted" boolean DEFAULT false,
    "kds_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "order_suites_kds_status_check" CHECK (("kds_status" = ANY (ARRAY['pending'::"text", 'new'::"text", 'preparing'::"text", 'ready'::"text", 'served'::"text"])))
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
    "server_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_reason" "text",
    "kds_status" "text" DEFAULT 'new'::"text" NOT NULL,
    "covers" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "orders_discount_amount_nonneg" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "orders_kds_status_check" CHECK (("kds_status" = ANY (ARRAY['new'::"text", 'preparing'::"text", 'ready'::"text", 'served'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Table des commandes avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."orders"."server_id" IS 'ID du serveur assigné à cette commande (obligatoire)';



CREATE TABLE IF NOT EXISTS "public"."organization_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "module" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "max_establishments" integer,
    "max_concurrent_devices" integer DEFAULT 1,
    "enabled_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "seats" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "organization_modules_module_check" CHECK (("module" = ANY (ARRAY['pos'::"text", 'kds'::"text", 'hr'::"text", 'haccp'::"text", 'booking'::"text"])))
);


ALTER TABLE "public"."organization_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pennylane_id" "text",
    "gocardless_customer_id" "text",
    "gocardless_mandate_id" "text",
    "subscription_status" "text",
    "subscription_plan" "text",
    CONSTRAINT "organizations_sub_plan_check" CHECK (("subscription_plan" = ANY (ARRAY['starter'::"text", 'basic'::"text", 'pro'::"text", 'premium'::"text"]))),
    CONSTRAINT "organizations_sub_status_check" CHECK (("subscription_status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'suspended'::"text", 'cancelled'::"text"])))
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


CREATE TABLE IF NOT EXISTS "public"."pos_device_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."pos_device_accounts" OWNER TO "postgres";


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
    "default_quantity" numeric(10,3) DEFAULT 1,
    "max_quantity" numeric(10,3) DEFAULT 10,
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
    "quantity_unit" character varying(20),
    "conversion_factor" numeric(12,6),
    "affects_stock" boolean DEFAULT false NOT NULL,
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



CREATE TABLE IF NOT EXISTS "public"."product_option_group_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "option_group_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_option_group_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_option_group_products" IS 'Assignation des groupes d''options aux produits (jointure N-N).';



CREATE TABLE IF NOT EXISTS "public"."product_option_group_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "option_group_id" "uuid" NOT NULL,
    "option_name" "text" NOT NULL,
    "option_value" "text" NOT NULL,
    "option_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "tva_rate" numeric(5,2) DEFAULT 20 NOT NULL,
    "min_quantity" integer,
    "max_quantity" integer,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_option_group_values_price_check" CHECK (("option_price" >= (0)::numeric)),
    CONSTRAINT "product_option_group_values_tva_check" CHECK (("tva_rate" >= (0)::numeric))
);


ALTER TABLE "public"."product_option_group_values" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_option_group_values" IS 'Choix disponibles dans un groupe d''options (ex : Saignante, Parmesan, Petite 25cm).';



CREATE TABLE IF NOT EXISTS "public"."product_option_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "selection_type" "text" DEFAULT 'unique'::"text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "max_selections" integer,
    "allow_quantity" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "auto_open_modal" boolean DEFAULT false NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_option_groups_selection_type_check" CHECK (("selection_type" = ANY (ARRAY['unique'::"text", 'unlimited'::"text", 'limited'::"text"])))
);


ALTER TABLE "public"."product_option_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_option_groups" IS 'Groupes d''options réutilisables définis au niveau établissement (Cuisson, Taille, Suppléments…).';



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
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "organization_id" "uuid",
    "is_available" boolean DEFAULT true,
    "created_by" "uuid",
    "category_id" "uuid",
    "display_order" integer DEFAULT 0,
    "vat_rate_id" "uuid",
    "printer_id" "uuid",
    "allergens" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "labels" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "product_type" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "portion_weight" numeric,
    "portion_unit" "text",
    "sku" "text",
    "food_cost_target" numeric,
    "stock_mode" "text" DEFAULT 'none'::"text" NOT NULL,
    "origins" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "products_food_cost_target_check" CHECK ((("food_cost_target" > (0)::numeric) AND ("food_cost_target" <= (1)::numeric))),
    CONSTRAINT "products_portion_weight_check" CHECK (("portion_weight" > (0)::numeric)),
    CONSTRAINT "products_stock_mode_check" CHECK (("stock_mode" = ANY (ARRAY['none'::"text", 'product'::"text", 'ingredients'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Table des produits avec ID UUID généré automatiquement';



COMMENT ON COLUMN "public"."products"."display_order" IS 'Ordre d''affichage des produits dans les grilles par catégorie';



COMMENT ON COLUMN "public"."products"."printer_id" IS 'Imprimante spécifique produit (override de categories.printer_id).';



COMMENT ON COLUMN "public"."products"."allergens" IS 'Tableau JSON des clés allergènes présents. Valeurs: gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs';



COMMENT ON COLUMN "public"."products"."labels" IS 'Tableau JSON des labels/régimes. Valeurs suggérées: vegetarian, vegan, gluten_free, organic, homemade, label_rouge, aop, halal, kosher, spicy, very_spicy, low_calorie, raw';



COMMENT ON COLUMN "public"."products"."product_type" IS 'Tableau JSON des types. Valeurs: dish, drink, dessert, starter, ingredient, supplement, menu_item';



COMMENT ON COLUMN "public"."products"."portion_weight" IS 'Poids ou volume de la portion (ex: 200 pour 200g)';



COMMENT ON COLUMN "public"."products"."portion_unit" IS 'Unité de la portion (ex: g, kg, cl, ml, pièce)';



COMMENT ON COLUMN "public"."products"."sku" IS 'Référence interne / code article (SKU)';



COMMENT ON COLUMN "public"."products"."food_cost_target" IS 'Food cost cible (ratio 0–1, ex: 0.30 = 30%). Alerte si coût réel dépasse cette valeur.';



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



CREATE TABLE IF NOT EXISTS "public"."public_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "menus_product_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "note" "text"
);


ALTER TABLE "public"."public_menu_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."public_menu_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);


ALTER TABLE "public"."public_menu_sections" OWNER TO "postgres";


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
    "created_by" "uuid",
    "deleted" boolean DEFAULT false,
    "establishment_id" "uuid",
    "unit" "text",
    "product_stock_id" "uuid" NOT NULL,
    "unit_cost" numeric(12,6),
    "remaining_quantity" numeric,
    "lot_allocations" "jsonb",
    "needs_review" boolean DEFAULT false NOT NULL,
    "recipe_product_id" "uuid",
    "supplier_reference_id" "uuid",
    CONSTRAINT "stock_movements_calculation_check" CHECK (("quantity_after" = ("quantity_before" + "quantity"))),
    CONSTRAINT "stock_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY (ARRAY['purchase'::"text", 'sale'::"text", 'adjustment'::"text", 'transfer'::"text", 'waste'::"text", 'production'::"text", 'reservation'::"text", 'unreservation'::"text", 'restore'::"text"]))),
    CONSTRAINT "stock_movements_quantity_check" CHECK (("quantity" <> (0)::numeric))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_movements" IS 'Historique complet des mouvements de stock pour traçabilité';



COMMENT ON COLUMN "public"."stock_movements"."movement_type" IS 'Type de mouvement: purchase, sale, adjustment, transfer, waste, production, reservation, unreservation';



COMMENT ON COLUMN "public"."stock_movements"."reference_id" IS 'ID de référence (commande, facture, ajustement, etc.)';



COMMENT ON COLUMN "public"."stock_movements"."unit_cost" IS 'Coût unitaire HT au moment du mouvement (renseigné sur les entrées purchase, null sur les consommations POS)';



CREATE TABLE IF NOT EXISTS "public"."supplier_price_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_reference_id" "uuid",
    "supplier_id" "uuid",
    "supplier_ref" "text",
    "unit_cost" numeric(14,4) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "unit_price" numeric,
    "order_unit" "text",
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "source_doc_import_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "supplier_price_snapshots_unit_cost_check" CHECK (("unit_cost" >= (0)::numeric))
);


ALTER TABLE "public"."supplier_price_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplier_price_snapshots" IS 'Snapshots du coût d''achat unitaire par produit. Remplace product_purchase_price_history. supplier_reference_id nullable = scans HACCP non rapprochés.';



CREATE TABLE IF NOT EXISTS "public"."supplier_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_product_ref" "text",
    "supplier_product_name" "text",
    "order_unit" "text",
    "conversion_factor" numeric DEFAULT 1 NOT NULL,
    "min_order_qty" numeric,
    "lead_time_days" integer,
    "is_preferred" boolean DEFAULT false NOT NULL,
    "unit_price" numeric(14,4),
    "notes" "text",
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "created_by" "uuid",
    CONSTRAINT "supplier_references_conversion_check" CHECK (("conversion_factor" > (0)::numeric)),
    CONSTRAINT "supplier_references_lead_time_check" CHECK (("lead_time_days" >= 0)),
    CONSTRAINT "supplier_references_min_order_check" CHECK (("min_order_qty" > (0)::numeric))
);


ALTER TABLE "public"."supplier_references" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplier_references" IS 'Références fournisseur par produit. N références par couple produit/fournisseur. Remplace product_suppliers.';



COMMENT ON COLUMN "public"."supplier_references"."conversion_factor" IS 'Nombre de portions (portion_unit) par unité de commande (order_unit).';



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "website" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "created_by" "uuid",
    "siret" "text",
    "tva_intracommunautaire" "text"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


COMMENT ON TABLE "public"."suppliers" IS 'Catalogue des fournisseurs, scoped par organisation.';



COMMENT ON COLUMN "public"."suppliers"."is_active" IS 'Désactiver un fournisseur le masque des selects sans le supprimer.';



CREATE TABLE IF NOT EXISTS "public"."support_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "content" "text" NOT NULL,
    "role" "text",
    "is_ai_generated" boolean DEFAULT false,
    "confidence_score" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "establishment_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "ai_handled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."table_order_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "table_id" "uuid" NOT NULL,
    "table_label" "text" NOT NULL,
    "guest_name" "text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rejection_reason" "text",
    "type" "text" DEFAULT 'order'::"text",
    "menu_id" "uuid",
    CONSTRAINT "table_order_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."table_order_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "color" "text" DEFAULT '#4169E1'::"text" NOT NULL,
    "shape" "text" DEFAULT 'circle'::"text" NOT NULL,
    "rotation" numeric DEFAULT '0'::numeric NOT NULL,
    "room_id" "uuid" NOT NULL,
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
    "deleted" boolean DEFAULT false,
    "role" "text" DEFAULT 'org_admin'::"text" NOT NULL,
    "establishment_id" "uuid",
    CONSTRAINT "users_organizations_role_check" CHECK (("role" = ANY (ARRAY['org_admin'::"text", 'manager'::"text", 'commercial'::"text"])))
);


ALTER TABLE "public"."users_organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."users_organizations" IS 'Table de liaison entre utilisateurs et organisations. Les rôles sont maintenant dans users_roles';



CREATE OR REPLACE VIEW "public"."v_stock_reconciliation" AS
SELECT
    NULL::"uuid" AS "product_stock_id",
    NULL::"uuid" AS "product_composition_id",
    NULL::"uuid" AS "establishment_id",
    NULL::"uuid" AS "organization_id",
    NULL::character varying(50) AS "unit",
    NULL::numeric(10,2) AS "current_stock",
    NULL::numeric AS "fifo_remaining_total",
    NULL::numeric AS "drift",
    NULL::boolean AS "has_drift";


ALTER VIEW "public"."v_stock_reconciliation" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."crm_commercial_objectives"
    ADD CONSTRAINT "crm_commercial_objectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_commercial_objectives"
    ADD CONSTRAINT "crm_commercial_objectives_user_id_month_key" UNIQUE ("user_id", "month");



ALTER TABLE ONLY "public"."crm_onboarding_checklists"
    ADD CONSTRAINT "crm_onboarding_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_onboarding_steps"
    ADD CONSTRAINT "crm_onboarding_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pre_invoice_installments"
    ADD CONSTRAINT "crm_pre_invoice_installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_pre_invoice_number_key" UNIQUE ("pre_invoice_number");



ALTER TABLE ONLY "public"."crm_products"
    ADD CONSTRAINT "crm_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_quote_items"
    ADD CONSTRAINT "crm_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_quote_number_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."crm_subscriptions"
    ADD CONSTRAINT "crm_subscriptions_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."doc_import_corrections"
    ADD CONSTRAINT "doc_import_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doc_import_lines"
    ADD CONSTRAINT "doc_import_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doc_import_usage"
    ADD CONSTRAINT "doc_import_usage_pkey" PRIMARY KEY ("organization_id", "month");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_image_hash_key" UNIQUE ("image_hash");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_module_access"
    ADD CONSTRAINT "employee_module_access_employee_id_module_establishment_id_key" UNIQUE ("employee_id", "module", "establishment_id");



ALTER TABLE ONLY "public"."employee_module_access"
    ADD CONSTRAINT "employee_module_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_employee_id_year_month_key" UNIQUE ("employee_id", "year", "month");



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_parent_shift_id_override_date_key" UNIQUE ("parent_shift_id", "override_date");



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_shift_templates"
    ADD CONSTRAINT "employee_shift_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_documents"
    ADD CONSTRAINT "establishment_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_gallery"
    ADD CONSTRAINT "establishment_gallery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_section_establishment_id_image_id_sec_key" UNIQUE ("establishment_id", "image_id", "section");



ALTER TABLE ONLY "public"."establishment_gallery_sections"
    ADD CONSTRAINT "establishment_gallery_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_modules"
    ADD CONSTRAINT "establishment_modules_establishment_module_unique" UNIQUE ("establishment_id", "module");



ALTER TABLE ONLY "public"."establishment_modules"
    ADD CONSTRAINT "establishment_modules_organization_id_establishment_id_modu_key" UNIQUE ("organization_id", "establishment_id", "module");



ALTER TABLE ONLY "public"."establishment_modules"
    ADD CONSTRAINT "establishment_modules_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."support_knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_contacts"
    ADD CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."employee_permissions"
    ADD CONSTRAINT "mobile_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "mobile_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_config"
    ADD CONSTRAINT "nf525_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."nf525_config"
    ADD CONSTRAINT "nf525_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_jet"
    ADD CONSTRAINT "nf525_jet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "nf525_order_refunds_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."order_payment_pools"
    ADD CONSTRAINT "order_payment_pools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_products"
    ADD CONSTRAINT "order_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "orders_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "orders_payments_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_organization_id_module_key" UNIQUE ("organization_id", "module");



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_device_accounts"
    ADD CONSTRAINT "pos_device_accounts_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."pos_device_accounts"
    ADD CONSTRAINT "pos_device_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_compositions"
    ADD CONSTRAINT "product_compositions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_option_group_products"
    ADD CONSTRAINT "product_option_group_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_option_group_values"
    ADD CONSTRAINT "product_option_group_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_option_groups"
    ADD CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."public_menu_items"
    ADD CONSTRAINT "public_menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_menu_sections"
    ADD CONSTRAINT "public_menu_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_purchase_requires_ref" CHECK (((("movement_type")::"text" <> 'purchase'::"text") OR ("supplier_reference_id" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_references"
    ADD CONSTRAINT "supplier_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."table_order_requests"
    ADD CONSTRAINT "table_order_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tables_connections"
    ADD CONSTRAINT "tables_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



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



CREATE INDEX "doc_import_corrections_import_id_idx" ON "public"."doc_import_corrections" USING "btree" ("import_id");



CREATE INDEX "doc_import_lines_import_id_idx" ON "public"."doc_import_lines" USING "btree" ("import_id");



CREATE INDEX "doc_import_usage_organization_id_month_idx" ON "public"."doc_import_usage" USING "btree" ("organization_id", "month");



CREATE INDEX "doc_imports_created_at_idx" ON "public"."doc_imports" USING "btree" ("created_at" DESC);



CREATE INDEX "doc_imports_establishment_id_idx" ON "public"."doc_imports" USING "btree" ("establishment_id");



CREATE INDEX "doc_imports_organization_id_idx" ON "public"."doc_imports" USING "btree" ("organization_id");



CREATE INDEX "doc_imports_status_idx" ON "public"."doc_imports" USING "btree" ("status");



CREATE INDEX "employee_shift_overrides_date_idx" ON "public"."employee_shift_overrides" USING "btree" ("override_date");



CREATE INDEX "employee_shift_overrides_establishment_idx" ON "public"."employee_shift_overrides" USING "btree" ("establishment_id");



CREATE INDEX "employee_shift_overrides_parent_idx" ON "public"."employee_shift_overrides" USING "btree" ("parent_shift_id");



CREATE INDEX "employees_auth_user_id_idx" ON "public"."employees" USING "btree" ("auth_user_id");



CREATE INDEX "idx_absences_employee" ON "public"."employee_absences" USING "btree" ("employee_id") WHERE ("deleted" = false);



CREATE INDEX "idx_absences_org" ON "public"."employee_absences" USING "btree" ("organization_id") WHERE ("deleted" = false);



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



CREATE INDEX "idx_crm_checklists_org_id" ON "public"."crm_onboarding_checklists" USING "btree" ("org_id") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_installments_pre_invoice_id" ON "public"."crm_pre_invoice_installments" USING "btree" ("pre_invoice_id");



CREATE INDEX "idx_crm_objectives_month" ON "public"."crm_commercial_objectives" USING "btree" ("month");



CREATE INDEX "idx_crm_objectives_user_id" ON "public"."crm_commercial_objectives" USING "btree" ("user_id");



CREATE INDEX "idx_crm_pre_invoices_created_by" ON "public"."crm_pre_invoices" USING "btree" ("created_by") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_pre_invoices_org_id" ON "public"."crm_pre_invoices" USING "btree" ("org_id") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_pre_invoices_quote_id" ON "public"."crm_pre_invoices" USING "btree" ("quote_id") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_quote_items_quote_id" ON "public"."crm_quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_crm_quotes_created_by" ON "public"."crm_quotes" USING "btree" ("created_by") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_quotes_lead_id" ON "public"."crm_quotes" USING "btree" ("lead_id") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_quotes_org_id" ON "public"."crm_quotes" USING "btree" ("org_id") WHERE ("deleted" = false);



CREATE INDEX "idx_crm_steps_checklist_id" ON "public"."crm_onboarding_steps" USING "btree" ("checklist_id");



CREATE INDEX "idx_crm_subscriptions_org_id" ON "public"."crm_subscriptions" USING "btree" ("org_id") WHERE ("deleted" = false);



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



CREATE INDEX "idx_doc_import_lines_import" ON "public"."doc_import_lines" USING "btree" ("import_id");



CREATE INDEX "idx_doc_import_lines_ps" ON "public"."doc_import_lines" USING "btree" ("supplier_reference_id") WHERE ("supplier_reference_id" IS NOT NULL);



CREATE INDEX "idx_email_logs_booking_id" ON "public"."email_logs" USING "btree" ("booking_id");



CREATE INDEX "idx_email_logs_recipient" ON "public"."email_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_logs_sent_at" ON "public"."email_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_emp_docs_employee" ON "public"."employee_documents" USING "btree" ("employee_id") WHERE ("deleted" = false);



CREATE INDEX "idx_employee_shift_templates_deleted" ON "public"."employee_shift_templates" USING "btree" ("deleted");



CREATE INDEX "idx_employee_shift_templates_establishment" ON "public"."employee_shift_templates" USING "btree" ("establishment_id");



CREATE INDEX "idx_employee_shifts_dates" ON "public"."employee_shifts" USING "btree" ("date_start", "date_end");



CREATE INDEX "idx_employee_shifts_deleted" ON "public"."employee_shifts" USING "btree" ("deleted");



CREATE INDEX "idx_employee_shifts_employee" ON "public"."employee_shifts" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_shifts_establishment" ON "public"."employee_shifts" USING "btree" ("establishment_id");



CREATE INDEX "idx_employees_estab" ON "public"."employees" USING "btree" ("establishment_id") WHERE (("deleted" = false) AND ("establishment_id" IS NOT NULL));



CREATE INDEX "idx_employees_mobile" ON "public"."employees" USING "btree" ("organization_id") WHERE (("has_mobile_access" = true) AND ("deleted" = false));



CREATE INDEX "idx_employees_org" ON "public"."employees" USING "btree" ("organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_estab_docs_estab" ON "public"."establishment_documents" USING "btree" ("establishment_id") WHERE ("deleted" = false);



CREATE INDEX "idx_estab_modules_estab" ON "public"."establishment_modules" USING "btree" ("establishment_id") WHERE (("deleted" = false) AND ("establishment_id" IS NOT NULL));



CREATE INDEX "idx_estab_modules_module" ON "public"."establishment_modules" USING "btree" ("module") WHERE ("deleted" = false);



CREATE INDEX "idx_estab_modules_org" ON "public"."establishment_modules" USING "btree" ("organization_id") WHERE ("deleted" = false);



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



CREATE INDEX "idx_lead_activities_lead_id" ON "public"."lead_activities" USING "btree" ("lead_id") WHERE ("deleted" = false);



CREATE INDEX "idx_lead_contacts_lead_id" ON "public"."lead_contacts" USING "btree" ("lead_id") WHERE ("deleted" = false);



CREATE INDEX "idx_lead_tasks_assigned_to" ON "public"."lead_tasks" USING "btree" ("assigned_to") WHERE (("deleted" = false) AND ("completed" = false));



CREATE INDEX "idx_lead_tasks_lead_id" ON "public"."lead_tasks" USING "btree" ("lead_id") WHERE ("deleted" = false);



CREATE INDEX "idx_leads_assigned_to" ON "public"."leads" USING "btree" ("assigned_to") WHERE ("deleted" = false);



CREATE INDEX "idx_leads_created_by" ON "public"."leads" USING "btree" ("created_by") WHERE ("deleted" = false);



CREATE INDEX "idx_leads_status" ON "public"."leads" USING "btree" ("status") WHERE ("deleted" = false);



CREATE INDEX "idx_menus_deleted" ON "public"."menus" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_menus_establishment" ON "public"."menus" USING "btree" ("establishment_id", "is_active") WHERE (("deleted" IS NULL) AND ("establishment_id" IS NOT NULL));



CREATE INDEX "idx_menus_organization_id" ON "public"."menus" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_deleted" ON "public"."menus_products" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_menus_products_establishment_id" ON "public"."menus_products" USING "btree" ("establishment_id");



CREATE INDEX "idx_menus_products_menu_product" ON "public"."menus_products" USING "btree" ("menus_id", "products_id");



CREATE INDEX "idx_menus_products_organization" ON "public"."menus_products" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_organization_id" ON "public"."menus_products" USING "btree" ("organization_id");



CREATE INDEX "idx_menus_products_price_history_mp_effective" ON "public"."menus_products_price_history" USING "btree" ("menus_products_id", "effective_from" DESC);



CREATE INDEX "idx_messages_deleted" ON "public"."messages" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_messages_organization_id" ON "public"."messages" USING "btree" ("organization_id");



CREATE INDEX "idx_mobile_user_permissions_deleted" ON "public"."employee_permissions" USING "btree" ("deleted");



CREATE INDEX "idx_mobile_user_permissions_establishment_id" ON "public"."employee_permissions" USING "btree" ("establishment_id");



CREATE INDEX "idx_mobile_user_permissions_mobile_user_id" ON "public"."employee_permissions" USING "btree" ("employee_id");



CREATE INDEX "idx_mobile_user_permissions_organization_id" ON "public"."employee_permissions" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_mobile_user_permissions_unique" ON "public"."employee_permissions" USING "btree" ("employee_id", "permission", "organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_module_access_employee" ON "public"."employee_module_access" USING "btree" ("employee_id") WHERE ("deleted" = false);



CREATE INDEX "idx_monthly_employee" ON "public"."employee_monthly_reports" USING "btree" ("employee_id", "year", "month") WHERE ("deleted" = false);



CREATE INDEX "idx_nf525_jet_code" ON "public"."nf525_jet" USING "btree" ("code_event");



CREATE INDEX "idx_nf525_jet_event_at" ON "public"."nf525_jet" USING "btree" ("event_at");



CREATE INDEX "idx_nf525_jet_purgeable" ON "public"."nf525_jet" USING "btree" ("purgeable");



CREATE INDEX "idx_nf525_order_refunds_establishment" ON "public"."nf525_order_refunds" USING "btree" ("establishment_id", "refunded_at" DESC);



CREATE INDEX "idx_nf525_order_refunds_payment" ON "public"."nf525_order_refunds" USING "btree" ("original_payment_id");



CREATE INDEX "idx_nf525_pieces_est_device" ON "public"."nf525_pieces" USING "btree" ("establishment_id", "device_id");



CREATE INDEX "idx_nf525_pieces_mobile_user_id" ON "public"."nf525_pieces" USING "btree" ("employee_id");



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



CREATE INDEX "idx_opp_order_id" ON "public"."order_payment_pools" USING "btree" ("order_id") WHERE (NOT "deleted");



CREATE INDEX "idx_opr_pool_id" ON "public"."order_payments_rows" USING "btree" ("pool_id") WHERE (("pool_id" IS NOT NULL) AND (NOT "deleted"));



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



CREATE INDEX "idx_order_suites_establishment_id" ON "public"."order_suites" USING "btree" ("establishment_id");



CREATE INDEX "idx_order_suites_order" ON "public"."order_suites" USING "btree" ("order");



CREATE INDEX "idx_order_suites_order_id" ON "public"."order_suites" USING "btree" ("order_id");



CREATE INDEX "idx_order_suites_organization_id" ON "public"."order_suites" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_organization_id" ON "public"."orders" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_payments_organization_id" ON "public"."order_payments" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_payments_rows_organization_id" ON "public"."order_payments_rows" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_server_id" ON "public"."orders" USING "btree" ("server_id");



CREATE INDEX "idx_org_modules_org" ON "public"."organization_modules" USING "btree" ("organization_id") WHERE ("deleted" = false);



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



CREATE INDEX "idx_product_option_group_products_group" ON "public"."product_option_group_products" USING "btree" ("option_group_id");



CREATE INDEX "idx_product_option_group_products_product" ON "public"."product_option_group_products" USING "btree" ("product_id");



CREATE INDEX "idx_product_option_group_values_group" ON "public"."product_option_group_values" USING "btree" ("option_group_id") WHERE ("deleted" = false);



CREATE INDEX "idx_product_option_groups_establishment" ON "public"."product_option_groups" USING "btree" ("establishment_id") WHERE ("deleted" = false);



CREATE INDEX "idx_product_option_groups_organization" ON "public"."product_option_groups" USING "btree" ("organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_product_stocks_establishment_id" ON "public"."product_stocks" USING "btree" ("establishment_id");



CREATE INDEX "idx_product_stocks_low_stock" ON "public"."product_stocks" USING "btree" ("organization_id", "current_stock") WHERE ("current_stock" <= "low_stock_threshold");



CREATE INDEX "idx_product_stocks_org" ON "public"."product_stocks" USING "btree" ("organization_id");



CREATE INDEX "idx_product_stocks_product_composition" ON "public"."product_stocks" USING "btree" ("product_composition_id");



CREATE INDEX "idx_products_allergens" ON "public"."products" USING "gin" ("allergens");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_category_order" ON "public"."products" USING "btree" ("category_id", "display_order");



CREATE INDEX "idx_products_labels" ON "public"."products" USING "gin" ("labels");



CREATE INDEX "idx_products_organization_id" ON "public"."products" USING "btree" ("organization_id");



CREATE INDEX "idx_products_printer_id" ON "public"."products" USING "btree" ("printer_id");



CREATE INDEX "idx_products_product_type" ON "public"."products" USING "gin" ("product_type") WHERE ("deleted" = false);



CREATE INDEX "idx_profiles_deleted" ON "public"."profiles" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_profiles_organization_id" ON "public"."profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_public_menu_items_organization" ON "public"."public_menu_items" USING "btree" ("organization_id");



CREATE INDEX "idx_public_menu_items_section" ON "public"."public_menu_items" USING "btree" ("section_id") WHERE ("deleted" = false);



CREATE INDEX "idx_public_menu_sections_establishment" ON "public"."public_menu_sections" USING "btree" ("establishment_id") WHERE ("deleted" = false);



CREATE INDEX "idx_public_menu_sections_organization" ON "public"."public_menu_sections" USING "btree" ("organization_id");



CREATE INDEX "idx_rooms_organization_id" ON "public"."rooms" USING "btree" ("organization_id");



CREATE INDEX "idx_sm_recipe_reporting" ON "public"."stock_movements" USING "btree" ("establishment_id", "recipe_product_id", "created_at") WHERE ((("movement_type")::"text" = ANY ((ARRAY['sale'::character varying, 'restore'::character varying])::"text"[])) AND ("deleted" = false));



CREATE INDEX "idx_stock_movements_date" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stock_movements_deleted" ON "public"."stock_movements" USING "btree" ("deleted");



CREATE INDEX "idx_stock_movements_establishment" ON "public"."stock_movements" USING "btree" ("establishment_id", "created_at" DESC) WHERE ("establishment_id" IS NOT NULL);



CREATE INDEX "idx_stock_movements_org" ON "public"."stock_movements" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_movements_reference" ON "public"."stock_movements" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_supplier_price_snapshots_product" ON "public"."supplier_price_snapshots" USING "btree" ("product_id", "effective_from" DESC);



CREATE INDEX "idx_supplier_price_snapshots_ref" ON "public"."supplier_price_snapshots" USING "btree" ("supplier_reference_id") WHERE ("supplier_reference_id" IS NOT NULL);



CREATE INDEX "idx_supplier_references_org_product" ON "public"."supplier_references" USING "btree" ("organization_id", "product_id");



CREATE INDEX "idx_supplier_references_product" ON "public"."supplier_references" USING "btree" ("product_id") WHERE ("deleted" = false);



CREATE INDEX "idx_supplier_references_supplier" ON "public"."supplier_references" USING "btree" ("supplier_id") WHERE ("deleted" = false);



CREATE INDEX "idx_suppliers_active" ON "public"."suppliers" USING "btree" ("organization_id", "name") WHERE (("deleted" = false) AND ("is_active" = true));



CREATE INDEX "idx_suppliers_organization_id" ON "public"."suppliers" USING "btree" ("organization_id") WHERE ("deleted" = false);



CREATE INDEX "idx_table_order_requests_est_status" ON "public"."table_order_requests" USING "btree" ("establishment_id", "status");



CREATE INDEX "idx_tables_connections_id" ON "public"."tables" USING "btree" ("tables_connections_id");



CREATE INDEX "idx_tables_connections_organization_id" ON "public"."tables_connections" USING "btree" ("organization_id");



CREATE INDEX "idx_tables_establishment_id" ON "public"."tables" USING "btree" ("establishment_id");



CREATE INDEX "idx_tables_organization_id" ON "public"."tables" USING "btree" ("organization_id");



CREATE INDEX "idx_users_establishment_id" ON "public"."employees" USING "btree" ("establishment_id");



CREATE INDEX "idx_users_is_active" ON "public"."employees" USING "btree" ("is_active");



CREATE INDEX "idx_users_organization_id" ON "public"."employees" USING "btree" ("organization_id");



CREATE INDEX "idx_users_organizations_deleted" ON "public"."users_organizations" USING "btree" ("deleted") WHERE ("deleted" = false);



CREATE INDEX "idx_users_organizations_organization_id" ON "public"."users_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_users_organizations_user_id" ON "public"."users_organizations" USING "btree" ("user_id");



CREATE INDEX "idx_users_role" ON "public"."employees" USING "btree" ("role");



CREATE INDEX "idx_vat_rate_organization_id" ON "public"."vat_rate" USING "btree" ("organization_id");



CREATE INDEX "idx_work_sessions_date" ON "public"."work_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_work_sessions_org" ON "public"."work_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_work_sessions_status" ON "public"."work_sessions" USING "btree" ("status");



CREATE INDEX "knowledge_base_embedding_idx" ON "public"."support_knowledge_base" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "menu_schedules_day_of_week_idx" ON "public"."menu_schedules" USING "btree" ("day_of_week");



CREATE INDEX "menu_schedules_menu_id_idx" ON "public"."menu_schedules" USING "btree" ("menu_id");



CREATE INDEX "menu_schedules_organization_id_idx" ON "public"."menu_schedules" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "menus_products_menus_id_products_id_active_idx" ON "public"."menus_products" USING "btree" ("menus_id", "products_id") WHERE ("deleted" = false);



CREATE INDEX "mobile_users_pin_code_idx" ON "public"."employees" USING "btree" ("pin_code");



CREATE UNIQUE INDEX "product_compositions_unique_main_component_kind_establishment" ON "public"."product_compositions" USING "btree" ("establishment_id", "main_product_id", "component_product_id", "composition_kind") WHERE (COALESCE("deleted", false) = false);



COMMENT ON INDEX "public"."product_compositions_unique_main_component_kind_establishment" IS 'Unicité logique : même ingrédient peut exister en recipe (ex. 2 steaks inclus) et en modifier (steaks supplémentaires), par établissement. Les lignes deleted=true ne participent pas à l''unicité.';



CREATE UNIQUE INDEX "product_option_group_products_unique" ON "public"."product_option_group_products" USING "btree" ("product_id", "option_group_id") WHERE ("deleted" = false);



CREATE OR REPLACE VIEW "public"."v_stock_reconciliation" AS
 SELECT "ps"."id" AS "product_stock_id",
    "ps"."product_composition_id",
    "ps"."establishment_id",
    "ps"."organization_id",
    "ps"."unit",
    "ps"."current_stock",
    COALESCE("sum"("sm"."remaining_quantity"), (0)::numeric) AS "fifo_remaining_total",
    ("ps"."current_stock" - COALESCE("sum"("sm"."remaining_quantity"), (0)::numeric)) AS "drift",
    ("abs"(("ps"."current_stock" - COALESCE("sum"("sm"."remaining_quantity"), (0)::numeric))) > 0.001) AS "has_drift"
   FROM ("public"."product_stocks" "ps"
     LEFT JOIN "public"."stock_movements" "sm" ON ((("sm"."product_stock_id" = "ps"."id") AND (("sm"."movement_type")::"text" = 'purchase'::"text") AND ("sm"."remaining_quantity" > (0)::numeric) AND ("sm"."deleted" = false))))
  WHERE ("ps"."deleted" = false)
  GROUP BY "ps"."id";



CREATE OR REPLACE TRIGGER "handle_times_categories" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_daily_found" BEFORE INSERT OR UPDATE ON "public"."daily_found" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_device_sessions" BEFORE INSERT OR UPDATE ON "public"."device_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_formulas" BEFORE INSERT OR UPDATE ON "public"."formulas" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_messages" BEFORE INSERT OR UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_opening_hours" BEFORE UPDATE ON "public"."opening_hours" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_opening_hours_exceptions" BEFORE UPDATE ON "public"."opening_hours_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_order_payments" BEFORE INSERT OR UPDATE ON "public"."order_payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_order_payments_rows" BEFORE INSERT OR UPDATE ON "public"."order_payments_rows" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_orders" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_printers" BEFORE INSERT OR UPDATE ON "public"."printers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_products" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_rooms" BEFORE INSERT OR UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_tables" BEFORE INSERT OR UPDATE ON "public"."tables" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_tables_connections" BEFORE INSERT OR UPDATE ON "public"."tables_connections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_times_vat_rate" BEFORE INSERT OR UPDATE ON "public"."vat_rate" FOR EACH ROW EXECUTE FUNCTION "public"."handle_times"();



CREATE OR REPLACE TRIGGER "handle_updated_at_actions" BEFORE UPDATE ON "public"."actions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_booking_exceptions" BEFORE UPDATE ON "public"."booking_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_booking_slots" BEFORE UPDATE ON "public"."booking_slots" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_booking_table_allocations" BEFORE UPDATE ON "public"."booking_table_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_bookings" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_cash_withdrawals" BEFORE UPDATE ON "public"."cash_withdrawals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_category_grid_items" BEFORE UPDATE ON "public"."category_grid_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_custom_domains" BEFORE UPDATE ON "public"."custom_domains" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_devices" BEFORE UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_email_logs" BEFORE UPDATE ON "public"."email_logs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_employee_permissions" BEFORE UPDATE ON "public"."employee_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_employee_shift_overrides" BEFORE UPDATE ON "public"."employee_shift_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_employee_shift_templates" BEFORE UPDATE ON "public"."employee_shift_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_employee_shifts" BEFORE UPDATE ON "public"."employee_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_employees" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_establishment_gallery" BEFORE UPDATE ON "public"."establishment_gallery" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_establishment_gallery_sections" BEFORE UPDATE ON "public"."establishment_gallery_sections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_establishments" BEFORE UPDATE ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_formula_products" BEFORE UPDATE ON "public"."formula_products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_formula_slots" BEFORE UPDATE ON "public"."formula_slots" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_leads" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_menu_schedules" BEFORE UPDATE ON "public"."menu_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_menus" BEFORE UPDATE ON "public"."menus" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_menus_products" BEFORE UPDATE ON "public"."menus_products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_nf525_config" BEFORE UPDATE ON "public"."nf525_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_nf525_order_refunds" BEFORE UPDATE ON "public"."nf525_order_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_nf525_restitutions" BEFORE UPDATE ON "public"."nf525_restitutions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_nf525_sequences" BEFORE UPDATE ON "public"."nf525_sequences" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_nf525_signing_keys" BEFORE UPDATE ON "public"."nf525_signing_keys" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_order_formulas" BEFORE UPDATE ON "public"."order_formulas" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_order_payment_settlements" BEFORE UPDATE ON "public"."order_payment_settlements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_order_products" BEFORE UPDATE ON "public"."order_products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_order_suites" BEFORE UPDATE ON "public"."order_suites" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_organizations" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_payment_methods" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_pos_device_accounts" BEFORE UPDATE ON "public"."pos_device_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_product_compositions" BEFORE UPDATE ON "public"."product_compositions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_product_stocks" BEFORE UPDATE ON "public"."product_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_public_menu_items" BEFORE UPDATE ON "public"."public_menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_public_menu_sections" BEFORE UPDATE ON "public"."public_menu_sections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_suppliers" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_users_organizations" BEFORE UPDATE ON "public"."users_organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_work_sessions" BEFORE UPDATE ON "public"."work_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "nf525_after_piece_insert" AFTER INSERT ON "public"."nf525_pieces" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_sync_sequence_on_piece_insert"();



CREATE OR REPLACE TRIGGER "trg_fifo_valorize" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_fifo_valorize"();



CREATE OR REPLACE TRIGGER "trg_lock_stock_unit" BEFORE UPDATE ON "public"."product_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."fn_lock_stock_unit"();



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."booking_exceptions"
    ADD CONSTRAINT "booking_exceptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_slots"
    ADD CONSTRAINT "booking_slots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."crm_commercial_objectives"
    ADD CONSTRAINT "crm_commercial_objectives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_onboarding_checklists"
    ADD CONSTRAINT "crm_onboarding_checklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_onboarding_checklists"
    ADD CONSTRAINT "crm_onboarding_checklists_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_onboarding_steps"
    ADD CONSTRAINT "crm_onboarding_steps_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."crm_onboarding_checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_pre_invoice_installments"
    ADD CONSTRAINT "crm_pre_invoice_installments_pre_invoice_id_fkey" FOREIGN KEY ("pre_invoice_id") REFERENCES "public"."crm_pre_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_pre_invoices"
    ADD CONSTRAINT "crm_pre_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_products"
    ADD CONSTRAINT "crm_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_quote_items"
    ADD CONSTRAINT "crm_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_quote_items"
    ADD CONSTRAINT "crm_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_quotes"
    ADD CONSTRAINT "crm_quotes_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_subscriptions"
    ADD CONSTRAINT "crm_subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_subscriptions"
    ADD CONSTRAINT "crm_subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_subscriptions"
    ADD CONSTRAINT "crm_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_found"
    ADD CONSTRAINT "daily_found_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_found"
    ADD CONSTRAINT "daily_found_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_device_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_mobile_user_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_orga_user_id_fkey" FOREIGN KEY ("orga_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."doc_import_corrections"
    ADD CONSTRAINT "doc_import_corrections_corrected_by_fkey" FOREIGN KEY ("corrected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."doc_import_corrections"
    ADD CONSTRAINT "doc_import_corrections_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."doc_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doc_import_lines"
    ADD CONSTRAINT "doc_import_lines_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."doc_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doc_import_lines"
    ADD CONSTRAINT "doc_import_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."doc_import_lines"
    ADD CONSTRAINT "doc_import_lines_supplier_reference_id_fkey" FOREIGN KEY ("supplier_reference_id") REFERENCES "public"."supplier_references"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."doc_import_usage"
    ADD CONSTRAINT "doc_import_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."doc_imports"
    ADD CONSTRAINT "doc_imports_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_module_access"
    ADD CONSTRAINT "employee_module_access_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_module_access"
    ADD CONSTRAINT "employee_module_access_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_module_access"
    ADD CONSTRAINT "employee_module_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_monthly_reports"
    ADD CONSTRAINT "employee_monthly_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_permissions"
    ADD CONSTRAINT "employee_permissions_granted_by_employee_id_fkey" FOREIGN KEY ("granted_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_shift_overrides"
    ADD CONSTRAINT "employee_shift_overrides_parent_shift_id_fkey" FOREIGN KEY ("parent_shift_id") REFERENCES "public"."employee_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_shift_templates"
    ADD CONSTRAINT "employee_shift_templates_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_shift_templates"
    ADD CONSTRAINT "employee_shift_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_employee_shift_template_id_fkey" FOREIGN KEY ("employee_shift_template_id") REFERENCES "public"."employee_shift_templates"("id");



ALTER TABLE ONLY "public"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."establishment_documents"
    ADD CONSTRAINT "establishment_documents_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_documents"
    ADD CONSTRAINT "establishment_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_gallery"
    ADD CONSTRAINT "establishment_gallery_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."establishment_modules"
    ADD CONSTRAINT "establishment_modules_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_modules"
    ADD CONSTRAINT "establishment_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_contacts"
    ADD CONSTRAINT "lead_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_converted_org_id_fkey" FOREIGN KEY ("converted_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."menu_schedules"
    ADD CONSTRAINT "menu_schedules_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_schedules"
    ADD CONSTRAINT "menu_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_establishments_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."menus"
    ADD CONSTRAINT "menus_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_menus_id_fkey" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."menus_products_price_history"
    ADD CONSTRAINT "menus_products_price_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."menus_products_price_history"
    ADD CONSTRAINT "menus_products_price_history_menus_products_id_fkey" FOREIGN KEY ("menus_products_id") REFERENCES "public"."menus_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menus_products"
    ADD CONSTRAINT "menus_products_products_id_fkey" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."employee_permissions"
    ADD CONSTRAINT "mobile_user_permissions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_permissions"
    ADD CONSTRAINT "mobile_user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employee_permissions"
    ADD CONSTRAINT "mobile_user_permissions_mobile_user_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_permissions"
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
    ADD CONSTRAINT "nf525_pieces_mobile_user_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "order_payment_settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_orders_payments_id_fkey" FOREIGN KEY ("orders_payments_id") REFERENCES "public"."order_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."order_payment_settlements"
    ADD CONSTRAINT "order_payment_settlements_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_order_products_id_fkey" FOREIGN KEY ("order_products_id") REFERENCES "public"."order_products"("id");



ALTER TABLE ONLY "public"."order_payments_rows"
    ADD CONSTRAINT "order_payments_rows_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "public"."order_payment_pools"("id");



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



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "order_refunds_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "order_refunds_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "order_refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "order_refunds_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."nf525_order_refunds"
    ADD CONSTRAINT "order_refunds_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "public"."order_payments"("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_suites"
    ADD CONSTRAINT "order_suites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "orders_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_tables_id_fkey" FOREIGN KEY ("tables_id") REFERENCES "public"."tables"("id");



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_device_accounts"
    ADD CONSTRAINT "pos_device_accounts_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_device_accounts"
    ADD CONSTRAINT "pos_device_accounts_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_device_accounts"
    ADD CONSTRAINT "pos_device_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."product_option_group_products"
    ADD CONSTRAINT "product_option_group_products_group_fkey" FOREIGN KEY ("option_group_id") REFERENCES "public"."product_option_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_option_group_products"
    ADD CONSTRAINT "product_option_group_products_product_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_option_group_values"
    ADD CONSTRAINT "product_option_group_values_group_fkey" FOREIGN KEY ("option_group_id") REFERENCES "public"."product_option_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_option_groups"
    ADD CONSTRAINT "product_option_groups_establishment_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_option_groups"
    ADD CONSTRAINT "product_option_groups_organization_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stocks"
    ADD CONSTRAINT "product_stocks_product_composition_id_fkey" FOREIGN KEY ("product_composition_id") REFERENCES "public"."product_compositions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."public_menu_items"
    ADD CONSTRAINT "public_menu_items_menus_product_id_fkey" FOREIGN KEY ("menus_product_id") REFERENCES "public"."menus_products"("id");



ALTER TABLE ONLY "public"."public_menu_items"
    ADD CONSTRAINT "public_menu_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."public_menu_items"
    ADD CONSTRAINT "public_menu_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."public_menu_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_menu_sections"
    ADD CONSTRAINT "public_menu_sections_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."public_menu_sections"
    ADD CONSTRAINT "public_menu_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_stock_id_fkey" FOREIGN KEY ("product_stock_id") REFERENCES "public"."product_stocks"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_supplier_reference_id_fkey" FOREIGN KEY ("supplier_reference_id") REFERENCES "public"."supplier_references"("id");



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_source_doc_import_id_fkey" FOREIGN KEY ("source_doc_import_id") REFERENCES "public"."doc_imports"("id");



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."supplier_price_snapshots"
    ADD CONSTRAINT "supplier_price_snapshots_supplier_reference_id_fkey" FOREIGN KEY ("supplier_reference_id") REFERENCES "public"."supplier_references"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_references"
    ADD CONSTRAINT "supplier_references_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_references"
    ADD CONSTRAINT "supplier_references_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."supplier_references"
    ADD CONSTRAINT "supplier_references_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_references"
    ADD CONSTRAINT "supplier_references_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."table_order_requests"
    ADD CONSTRAINT "table_order_requests_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."table_order_requests"
    ADD CONSTRAINT "table_order_requests_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id");



ALTER TABLE ONLY "public"."table_order_requests"
    ADD CONSTRAINT "table_order_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."table_order_requests"
    ADD CONSTRAINT "table_order_requests_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id");



ALTER TABLE ONLY "public"."tables_connections"
    ADD CONSTRAINT "tables_connections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tables_connections"
    ADD CONSTRAINT "tables_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tables"
    ADD CONSTRAINT "tables_tables_connections_id_fkey" FOREIGN KEY ("tables_connections_id") REFERENCES "public"."tables_connections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "users_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id");



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users_organizations"
    ADD CONSTRAINT "users_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vat_rate"
    ADD CONSTRAINT "vat_rate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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


CREATE POLICY "actions_delete_universal" ON "public"."actions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "actions_insert_universal" ON "public"."actions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "actions_select_universal" ON "public"."actions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "actions_update_universal" ON "public"."actions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "anon_select_order_payments" ON "public"."order_payments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_order_payments_rows" ON "public"."order_payments_rows" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_order_products" ON "public"."order_products" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."booking_exceptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_exceptions_delete_universal" ON "public"."booking_exceptions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_exceptions_insert_universal" ON "public"."booking_exceptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_exceptions_public_read" ON "public"."booking_exceptions" FOR SELECT TO "anon" USING ((("deleted" = false) OR ("deleted" IS NULL)));



CREATE POLICY "booking_exceptions_select_universal" ON "public"."booking_exceptions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_exceptions_update_universal" ON "public"."booking_exceptions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."booking_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_slots_delete_universal" ON "public"."booking_slots" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_slots_insert_universal" ON "public"."booking_slots" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_slots_public_read" ON "public"."booking_slots" FOR SELECT USING ((("is_active" = true) AND ("deleted" = false)));



CREATE POLICY "booking_slots_select_universal" ON "public"."booking_slots" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_slots_update_universal" ON "public"."booking_slots" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."booking_table_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_table_allocations_delete_universal" ON "public"."booking_table_allocations" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_table_allocations_insert_universal" ON "public"."booking_table_allocations" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_table_allocations_select_universal" ON "public"."booking_table_allocations" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "booking_table_allocations_update_universal" ON "public"."booking_table_allocations" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_delete_universal" ON "public"."bookings" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "bookings_insert_anon" ON "public"."bookings" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "bookings_insert_universal" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "bookings_select_universal" ON "public"."bookings" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "bookings_update_universal" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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


CREATE POLICY "cash_withdrawals_delete_universal" ON "public"."cash_withdrawals" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "cash_withdrawals_insert_universal" ON "public"."cash_withdrawals" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "cash_withdrawals_select_universal" ON "public"."cash_withdrawals" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "cash_withdrawals_update_universal" ON "public"."cash_withdrawals" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_universal" ON "public"."categories" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "categories_insert_universal" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "categories_public_read" ON "public"."categories" FOR SELECT USING (("deleted" = false));



CREATE POLICY "categories_select_universal" ON "public"."categories" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "categories_update_universal" ON "public"."categories" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."category_grid_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_grid_items_delete_universal" ON "public"."category_grid_items" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "category_grid_items_insert_universal" ON "public"."category_grid_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "category_grid_items_select_universal" ON "public"."category_grid_items" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "category_grid_items_update_universal" ON "public"."category_grid_items" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."crm_commercial_objectives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_installments_insert" ON "public"."crm_pre_invoice_installments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_installments_select" ON "public"."crm_pre_invoice_installments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ("pi"."deleted" = false) AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_installments_update" ON "public"."crm_pre_invoice_installments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_objectives_insert" ON "public"."crm_commercial_objectives" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



CREATE POLICY "crm_objectives_select" ON "public"."crm_commercial_objectives" FOR SELECT USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



CREATE POLICY "crm_objectives_update" ON "public"."crm_commercial_objectives" FOR UPDATE USING ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text")) WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



ALTER TABLE "public"."crm_onboarding_checklists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_onboarding_checklists_delete" ON "public"."crm_onboarding_checklists" FOR DELETE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



CREATE POLICY "crm_onboarding_checklists_insert" ON "public"."crm_onboarding_checklists" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])));



CREATE POLICY "crm_onboarding_checklists_select" ON "public"."crm_onboarding_checklists" FOR SELECT USING ((("deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "crm_onboarding_checklists"."org_id") AND ("o"."deleted" = false)))))));



CREATE POLICY "crm_onboarding_checklists_update" ON "public"."crm_onboarding_checklists" FOR UPDATE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



ALTER TABLE "public"."crm_onboarding_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_onboarding_steps_delete" ON "public"."crm_onboarding_steps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_onboarding_checklists" "c"
  WHERE (("c"."id" = "crm_onboarding_steps"."checklist_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."organizations" "o"
          WHERE (("o"."id" = "c"."org_id") AND ("o"."deleted" = false)))))))));



CREATE POLICY "crm_onboarding_steps_insert" ON "public"."crm_onboarding_steps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_onboarding_checklists" "c"
  WHERE (("c"."id" = "crm_onboarding_steps"."checklist_id") AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"]))))));



CREATE POLICY "crm_onboarding_steps_select" ON "public"."crm_onboarding_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_onboarding_checklists" "c"
  WHERE (("c"."id" = "crm_onboarding_steps"."checklist_id") AND ("c"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."organizations" "o"
          WHERE (("o"."id" = "c"."org_id") AND ("o"."deleted" = false)))))))));



CREATE POLICY "crm_onboarding_steps_update" ON "public"."crm_onboarding_steps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_onboarding_checklists" "c"
  WHERE (("c"."id" = "crm_onboarding_steps"."checklist_id") AND ("c"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."organizations" "o"
          WHERE (("o"."id" = "c"."org_id") AND ("o"."deleted" = false))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_onboarding_checklists" "c"
  WHERE (("c"."id" = "crm_onboarding_steps"."checklist_id") AND ("c"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."organizations" "o"
          WHERE (("o"."id" = "c"."org_id") AND ("o"."deleted" = false)))))))));



ALTER TABLE "public"."crm_pre_invoice_installments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_pre_invoice_installments_delete" ON "public"."crm_pre_invoice_installments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_pre_invoice_installments_insert" ON "public"."crm_pre_invoice_installments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_pre_invoice_installments_select" ON "public"."crm_pre_invoice_installments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ("pi"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_pre_invoice_installments_update" ON "public"."crm_pre_invoice_installments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_pre_invoices" "pi"
  WHERE (("pi"."id" = "crm_pre_invoice_installments"."pre_invoice_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("pi"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



ALTER TABLE "public"."crm_pre_invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_pre_invoices_delete" ON "public"."crm_pre_invoices" FOR DELETE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



CREATE POLICY "crm_pre_invoices_insert" ON "public"."crm_pre_invoices" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])));



CREATE POLICY "crm_pre_invoices_select" ON "public"."crm_pre_invoices" FOR SELECT USING ((("deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))));



CREATE POLICY "crm_pre_invoices_update" ON "public"."crm_pre_invoices" FOR UPDATE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



ALTER TABLE "public"."crm_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_products_delete" ON "public"."crm_products" FOR DELETE USING ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



CREATE POLICY "crm_products_insert" ON "public"."crm_products" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



CREATE POLICY "crm_products_select" ON "public"."crm_products" FOR SELECT USING ((("deleted" = false) AND (((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"]))));



CREATE POLICY "crm_products_update" ON "public"."crm_products" FOR UPDATE USING ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text")) WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



ALTER TABLE "public"."crm_quote_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_quote_items_delete" ON "public"."crm_quote_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_quotes" "q"
  WHERE (("q"."id" = "crm_quote_items"."quote_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("q"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_quote_items_insert" ON "public"."crm_quote_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_quotes" "q"
  WHERE (("q"."id" = "crm_quote_items"."quote_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("q"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_quote_items_select" ON "public"."crm_quote_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_quotes" "q"
  WHERE (("q"."id" = "crm_quote_items"."quote_id") AND ("q"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("q"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



CREATE POLICY "crm_quote_items_update" ON "public"."crm_quote_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_quotes" "q"
  WHERE (("q"."id" = "crm_quote_items"."quote_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("q"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_quotes" "q"
  WHERE (("q"."id" = "crm_quote_items"."quote_id") AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("q"."created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))))));



ALTER TABLE "public"."crm_quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_quotes_delete" ON "public"."crm_quotes" FOR DELETE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



CREATE POLICY "crm_quotes_insert" ON "public"."crm_quotes" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])));



CREATE POLICY "crm_quotes_select" ON "public"."crm_quotes" FOR SELECT USING ((("deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))));



CREATE POLICY "crm_quotes_update" ON "public"."crm_quotes" FOR UPDATE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



ALTER TABLE "public"."crm_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_subscriptions_delete" ON "public"."crm_subscriptions" FOR DELETE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



CREATE POLICY "crm_subscriptions_insert" ON "public"."crm_subscriptions" FOR INSERT WITH CHECK ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])));



CREATE POLICY "crm_subscriptions_select" ON "public"."crm_subscriptions" FOR SELECT USING ((("deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))));



CREATE POLICY "crm_subscriptions_update" ON "public"."crm_subscriptions" FOR UPDATE USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR (("created_by")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))));



ALTER TABLE "public"."custom_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_domains_delete_universal" ON "public"."custom_domains" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "custom_domains_insert_universal" ON "public"."custom_domains" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "custom_domains_public_read" ON "public"."custom_domains" FOR SELECT USING ((("is_active" = true) AND ("deleted" = false)));



CREATE POLICY "custom_domains_select_universal" ON "public"."custom_domains" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "custom_domains_update_universal" ON "public"."custom_domains" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."daily_found" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_found_delete_universal" ON "public"."daily_found" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "daily_found_insert_universal" ON "public"."daily_found" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "daily_found_select_universal" ON "public"."daily_found" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "daily_found_update_universal" ON "public"."daily_found" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_sessions_delete_universal" ON "public"."device_sessions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "device_sessions_insert_universal" ON "public"."device_sessions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "device_sessions_select_universal" ON "public"."device_sessions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "device_sessions_update_universal" ON "public"."device_sessions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "devices_delete_universal" ON "public"."devices" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "devices_insert_universal" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "devices_select_universal" ON "public"."devices" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "devices_update_universal" ON "public"."devices" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."doc_import_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doc_import_corrections_delete_universal" ON "public"."doc_import_corrections" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_corrections"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_corrections_insert_universal" ON "public"."doc_import_corrections" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_corrections"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_corrections_select_universal" ON "public"."doc_import_corrections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_corrections"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_corrections_update_universal" ON "public"."doc_import_corrections" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_corrections"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



ALTER TABLE "public"."doc_import_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doc_import_lines_delete_universal" ON "public"."doc_import_lines" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_lines"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_lines_insert_universal" ON "public"."doc_import_lines" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_lines"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_lines_select_universal" ON "public"."doc_import_lines" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_lines"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



CREATE POLICY "doc_import_lines_update_universal" ON "public"."doc_import_lines" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doc_imports" "di"
  WHERE (("di"."id" = "doc_import_lines"."import_id") AND ("di"."organization_id" IN ( SELECT "users_organizations"."organization_id"
           FROM "public"."users_organizations"
          WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))))));



ALTER TABLE "public"."doc_import_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doc_import_usage_select_universal" ON "public"."doc_import_usage" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."doc_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doc_imports_delete_universal" ON "public"."doc_imports" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "doc_imports_insert_universal" ON "public"."doc_imports" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "doc_imports_select_universal" ON "public"."doc_imports" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "doc_imports_update_universal" ON "public"."doc_imports" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



ALTER TABLE "public"."employee_absences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_absences_delete_universal" ON "public"."employee_absences" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_absences_insert_universal" ON "public"."employee_absences" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_absences_select_universal" ON "public"."employee_absences" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_absences_update_universal" ON "public"."employee_absences" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_documents_delete_universal" ON "public"."employee_documents" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "employee_documents_insert_universal" ON "public"."employee_documents" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "employee_documents_select_universal" ON "public"."employee_documents" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "employee_documents_update_universal" ON "public"."employee_documents" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."employee_module_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_module_access_delete_universal" ON "public"."employee_module_access" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_module_access_insert_universal" ON "public"."employee_module_access" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_module_access_select_universal" ON "public"."employee_module_access" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_module_access_update_universal" ON "public"."employee_module_access" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_monthly_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_monthly_reports_delete_universal" ON "public"."employee_monthly_reports" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_monthly_reports_insert_universal" ON "public"."employee_monthly_reports" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_monthly_reports_select_universal" ON "public"."employee_monthly_reports" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_monthly_reports_update_universal" ON "public"."employee_monthly_reports" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_permissions_delete_universal" ON "public"."employee_permissions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_permissions_insert_universal" ON "public"."employee_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_permissions_select_universal" ON "public"."employee_permissions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_permissions_update_universal" ON "public"."employee_permissions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_shift_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_shift_overrides_delete_universal" ON "public"."employee_shift_overrides" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_overrides_insert_universal" ON "public"."employee_shift_overrides" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_overrides_select_universal" ON "public"."employee_shift_overrides" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_overrides_update_universal" ON "public"."employee_shift_overrides" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_shift_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_shift_templates_delete_universal" ON "public"."employee_shift_templates" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_templates_insert_universal" ON "public"."employee_shift_templates" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_templates_select_universal" ON "public"."employee_shift_templates" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shift_templates_update_universal" ON "public"."employee_shift_templates" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employee_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_shifts_delete_universal" ON "public"."employee_shifts" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shifts_insert_universal" ON "public"."employee_shifts" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shifts_select_universal" ON "public"."employee_shifts" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employee_shifts_update_universal" ON "public"."employee_shifts" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_can_read_own_establishment" ON "public"."establishments" FOR SELECT USING (("id" = ( SELECT "employees"."establishment_id"
   FROM "public"."employees"
  WHERE (("employees"."auth_user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("employees"."deleted" = false))
 LIMIT 1)));



CREATE POLICY "employees_delete_universal" ON "public"."employees" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employees_insert_universal" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employees_select_universal" ON "public"."employees" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "employees_self_select" ON "public"."employees" FOR SELECT TO "authenticated" USING (("auth_user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"));



CREATE POLICY "employees_update_universal" ON "public"."employees" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."establishment_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_documents_delete_universal" ON "public"."establishment_documents" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_documents_insert_universal" ON "public"."establishment_documents" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_documents_select_universal" ON "public"."establishment_documents" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_documents_update_universal" ON "public"."establishment_documents" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."establishment_gallery" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_gallery_delete_universal" ON "public"."establishment_gallery" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_insert_universal" ON "public"."establishment_gallery" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."establishment_gallery_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_gallery_sections_delete_universal" ON "public"."establishment_gallery_sections" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_sections_insert_universal" ON "public"."establishment_gallery_sections" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_sections_select_universal" ON "public"."establishment_gallery_sections" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_sections_update_universal" ON "public"."establishment_gallery_sections" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_select_universal" ON "public"."establishment_gallery" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_gallery_update_universal" ON "public"."establishment_gallery" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."establishment_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_modules_delete_universal" ON "public"."establishment_modules" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_modules_insert_universal" ON "public"."establishment_modules" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_modules_select_universal" ON "public"."establishment_modules" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "establishment_modules_update_universal" ON "public"."establishment_modules" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."establishments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishments_delete_universal" ON "public"."establishments" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NULL)))));



CREATE POLICY "establishments_insert_universal" ON "public"."establishments" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NULL)))));



CREATE POLICY "establishments_public_read" ON "public"."establishments" FOR SELECT USING (("deleted" = false));



CREATE POLICY "establishments_select_universal" ON "public"."establishments" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NULL)))) OR ("id" IN ( SELECT "uo"."establishment_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NOT NULL))))));



CREATE POLICY "establishments_update_universal" ON "public"."establishments" FOR UPDATE TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NULL)))) OR ("id" IN ( SELECT "uo"."establishment_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NOT NULL)))))) WITH CHECK ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NULL)))) OR ("id" IN ( SELECT "uo"."establishment_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false) AND ("uo"."establishment_id" IS NOT NULL))))));



ALTER TABLE "public"."formula_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formula_products_delete_universal" ON "public"."formula_products" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_products_insert_universal" ON "public"."formula_products" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_products_select_universal" ON "public"."formula_products" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_products_update_universal" ON "public"."formula_products" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."formula_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formula_slots_delete_universal" ON "public"."formula_slots" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_slots_insert_universal" ON "public"."formula_slots" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_slots_select_universal" ON "public"."formula_slots" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formula_slots_update_universal" ON "public"."formula_slots" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."formulas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formulas_delete_universal" ON "public"."formulas" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formulas_insert_universal" ON "public"."formulas" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formulas_select_universal" ON "public"."formulas" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "formulas_update_universal" ON "public"."formulas" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



CREATE POLICY "knowledge_base_select_universal" ON "public"."support_knowledge_base" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."lead_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_activities_insert_universal" ON "public"."lead_activities" FOR INSERT TO "authenticated" WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])) AND ("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")))))));



CREATE POLICY "lead_activities_select_universal" ON "public"."lead_activities" FOR SELECT TO "authenticated" USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))));



ALTER TABLE "public"."lead_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_contacts_insert_universal" ON "public"."lead_contacts" FOR INSERT TO "authenticated" WITH CHECK (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))));



CREATE POLICY "lead_contacts_select_universal" ON "public"."lead_contacts" FOR SELECT TO "authenticated" USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))));



CREATE POLICY "lead_contacts_update_universal" ON "public"."lead_contacts" FOR UPDATE TO "authenticated" USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")))))) WITH CHECK (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))));



ALTER TABLE "public"."lead_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_tasks_insert_universal" ON "public"."lead_tasks" FOR INSERT TO "authenticated" WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])) AND ("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")))))));



CREATE POLICY "lead_tasks_select_universal" ON "public"."lead_tasks" FOR SELECT TO "authenticated" USING ((("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE (("leads"."deleted" = false) AND ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("leads"."assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("leads"."created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))) OR ("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")));



CREATE POLICY "lead_tasks_update_universal" ON "public"."lead_tasks" FOR UPDATE TO "authenticated" USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")));



ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_delete_universal" ON "public"."leads" FOR DELETE TO "authenticated" USING ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



CREATE POLICY "leads_insert_universal" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['system_admin'::"text", 'commercial'::"text", 'account_manager'::"text"])) AND ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")));



CREATE POLICY "leads_select_universal" ON "public"."leads" FOR SELECT TO "authenticated" USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['commercial'::"text", 'account_manager'::"text"])) AND ("deleted" = false) AND (("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")))));



CREATE POLICY "leads_update_universal" ON "public"."leads" FOR UPDATE TO "authenticated" USING (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['commercial'::"text", 'account_manager'::"text"])) AND (("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid"))))) WITH CHECK (((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text") OR ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['commercial'::"text", 'account_manager'::"text"])) AND (("assigned_to" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") OR ("created_by" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")))));



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


CREATE POLICY "menus_delete_universal" ON "public"."menus" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "menus_insert_universal" ON "public"."menus" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."menus_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "menus_products_delete_universal" ON "public"."menus_products" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "menus_products_insert_universal" ON "public"."menus_products" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



CREATE POLICY "menus_products_select_universal" ON "public"."menus_products" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "menus_products_update_universal" ON "public"."menus_products" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "menus_public_read" ON "public"."menus" FOR SELECT USING ((("deleted" = false) AND ("is_public" = true)));



CREATE POLICY "menus_select_public" ON "public"."menus" FOR SELECT USING ((("is_public" = true) AND ("deleted" = false)));



CREATE POLICY "menus_select_universal" ON "public"."menus" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "menus_update_universal" ON "public"."menus" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



ALTER TABLE "public"."nf525_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_config_select" ON "public"."nf525_config" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."nf525_jet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_jet_insert" ON "public"."nf525_jet" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



CREATE POLICY "nf525_jet_select" ON "public"."nf525_jet" FOR SELECT TO "authenticated" USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))));



CREATE POLICY "nf525_jet_select_universal" ON "public"."nf525_jet" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "nf525_jet_update" ON "public"."nf525_jet" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id"))) WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



ALTER TABLE "public"."nf525_order_refunds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_order_refunds_insert" ON "public"."nf525_order_refunds" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



CREATE POLICY "nf525_order_refunds_select" ON "public"."nf525_order_refunds" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_order_refunds_select_universal" ON "public"."nf525_order_refunds" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "nf525_order_refunds_update" ON "public"."nf525_order_refunds" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id"))) WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



ALTER TABLE "public"."nf525_piece_recap_tva" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nf525_pieces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_pieces_insert" ON "public"."nf525_pieces" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



CREATE POLICY "nf525_pieces_select" ON "public"."nf525_pieces" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_pieces_select_universal" ON "public"."nf525_pieces" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "nf525_pieces_update" ON "public"."nf525_pieces" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id"))) WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



CREATE POLICY "nf525_recap_insert" ON "public"."nf525_piece_recap_tva" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."nf525_pieces" "p"
  WHERE (("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id") AND "public"."auth_can_access_establishment"("p"."organization_id", "p"."establishment_id"))))));



CREATE POLICY "nf525_recap_select" ON "public"."nf525_piece_recap_tva" FOR SELECT TO "authenticated" USING ((( SELECT "p"."organization_id"
   FROM "public"."nf525_pieces" "p"
  WHERE ("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id")) IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_recap_update" ON "public"."nf525_piece_recap_tva" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."nf525_pieces" "p"
  WHERE (("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id") AND "public"."auth_can_access_establishment"("p"."organization_id", "p"."establishment_id")))))) WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."nf525_pieces" "p"
  WHERE (("p"."id" = "nf525_piece_recap_tva"."nf525_piece_id") AND "public"."auth_can_access_establishment"("p"."organization_id", "p"."establishment_id"))))));



ALTER TABLE "public"."nf525_restitutions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_restitutions_insert" ON "public"."nf525_restitutions" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



CREATE POLICY "nf525_restitutions_select" ON "public"."nf525_restitutions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_restitutions_select_universal" ON "public"."nf525_restitutions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "nf525_restitutions_update" ON "public"."nf525_restitutions" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id"))) WITH CHECK ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'orga_user'::"text") AND "public"."auth_can_access_establishment"("organization_id", "establishment_id")));



ALTER TABLE "public"."nf525_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_sequences_select" ON "public"."nf525_sequences" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_sequences_select_universal" ON "public"."nf525_sequences" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."nf525_signing_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nf525_signing_keys_select" ON "public"."nf525_signing_keys" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "nf525_signing_keys_select_universal" ON "public"."nf525_signing_keys" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."opening_hours" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opening_hours_delete_universal" ON "public"."opening_hours" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."opening_hours_exceptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opening_hours_exceptions_delete_universal" ON "public"."opening_hours_exceptions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_exceptions_insert_universal" ON "public"."opening_hours_exceptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_exceptions_public_read" ON "public"."opening_hours_exceptions" FOR SELECT USING (("deleted" = false));



CREATE POLICY "opening_hours_exceptions_select_universal" ON "public"."opening_hours_exceptions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_exceptions_update_universal" ON "public"."opening_hours_exceptions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_insert_universal" ON "public"."opening_hours" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_public_read" ON "public"."opening_hours" FOR SELECT USING (("deleted" = false));



CREATE POLICY "opening_hours_select_universal" ON "public"."opening_hours" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "opening_hours_update_universal" ON "public"."opening_hours" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_formulas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_formulas_delete_universal" ON "public"."order_formulas" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_formulas_insert_universal" ON "public"."order_formulas" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_formulas_select_universal" ON "public"."order_formulas" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_formulas_update_universal" ON "public"."order_formulas" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_payment_pools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payment_pools_delete" ON "public"."order_payment_pools" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_pools_delete_universal" ON "public"."order_payment_pools" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_pools_insert" ON "public"."order_payment_pools" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_pools_insert_universal" ON "public"."order_payment_pools" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_pools_select" ON "public"."order_payment_pools" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_pools_select_universal" ON "public"."order_payment_pools" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_pools_update" ON "public"."order_payment_pools" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "order_payment_pools_update_universal" ON "public"."order_payment_pools" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_payment_settlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payment_settlements_delete_universal" ON "public"."order_payment_settlements" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_settlements_insert_universal" ON "public"."order_payment_settlements" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_settlements_select_universal" ON "public"."order_payment_settlements" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payment_settlements_update_universal" ON "public"."order_payment_settlements" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payments_delete_universal" ON "public"."order_payments" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_insert_universal" ON "public"."order_payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_payments_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payments_rows_delete_universal" ON "public"."order_payments_rows" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_rows_insert_universal" ON "public"."order_payments_rows" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_rows_select_universal" ON "public"."order_payments_rows" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_rows_update_universal" ON "public"."order_payments_rows" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_select_universal" ON "public"."order_payments" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_payments_update_universal" ON "public"."order_payments" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_products_delete_universal" ON "public"."order_products" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_products_insert_universal" ON "public"."order_products" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_products_select_universal" ON "public"."order_products" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_products_update_universal" ON "public"."order_products" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."order_suites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_suites_delete_universal" ON "public"."order_suites" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_suites_insert_universal" ON "public"."order_suites" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_suites_select_universal" ON "public"."order_suites" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "order_suites_update_universal" ON "public"."order_suites" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete_universal" ON "public"."orders" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "orders_insert_universal" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



CREATE POLICY "orders_select_universal" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "orders_update_universal" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "org_admin_gallery_management" ON "public"."establishment_gallery" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."organization_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_modules_delete_universal" ON "public"."organization_modules" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organization_modules_insert_universal" ON "public"."organization_modules" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organization_modules_select_universal" ON "public"."organization_modules" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "organization_modules_update_universal" ON "public"."organization_modules" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


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


CREATE POLICY "payment_methods_delete_universal" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "payment_methods_insert_universal" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "payment_methods_select_universal" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "payment_methods_update_universal" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."pos_device_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pos_device_accounts_delete" ON "public"."pos_device_accounts" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "pos_device_accounts_insert" ON "public"."pos_device_accounts" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



CREATE POLICY "pos_device_accounts_select" ON "public"."pos_device_accounts" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))) OR ("auth_user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid")));



CREATE POLICY "pos_device_accounts_update" ON "public"."pos_device_accounts" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL)))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND (("uo"."deleted" = false) OR ("uo"."deleted" IS NULL))))));



ALTER TABLE "public"."printers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "printers_delete_universal" ON "public"."printers" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "printers_insert_universal" ON "public"."printers" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "printers_select_universal" ON "public"."printers" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "printers_update_universal" ON "public"."printers" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."product_compositions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_compositions_delete_universal" ON "public"."product_compositions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_compositions_insert_universal" ON "public"."product_compositions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_compositions_select_universal" ON "public"."product_compositions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_compositions_update_universal" ON "public"."product_compositions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."product_option_group_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_option_group_products_delete" ON "public"."product_option_group_products" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_products"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_products_insert" ON "public"."product_option_group_products" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_products"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_products_select" ON "public"."product_option_group_products" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_products"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_products_update" ON "public"."product_option_group_products" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_products"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_products"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



ALTER TABLE "public"."product_option_group_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_option_group_values_delete" ON "public"."product_option_group_values" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_values"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_values_insert" ON "public"."product_option_group_values" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_values"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_values_select" ON "public"."product_option_group_values" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_values"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_group_values_update" ON "public"."product_option_group_values" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_values"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."product_option_groups" "g"
     JOIN "public"."users_organizations" "uo" ON (("uo"."organization_id" = "g"."organization_id")))
  WHERE (("g"."id" = "product_option_group_values"."option_group_id") AND ("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



ALTER TABLE "public"."product_option_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_option_groups_delete" ON "public"."product_option_groups" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_groups_delete_universal" ON "public"."product_option_groups" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_option_groups_insert" ON "public"."product_option_groups" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_groups_insert_universal" ON "public"."product_option_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_option_groups_select" ON "public"."product_option_groups" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_groups_select_universal" ON "public"."product_option_groups" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_option_groups_update" ON "public"."product_option_groups" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM "public"."users_organizations" "uo"
  WHERE (("uo"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("uo"."deleted" = false)))));



CREATE POLICY "product_option_groups_update_universal" ON "public"."product_option_groups" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."product_stocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_stocks_delete_universal" ON "public"."product_stocks" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_stocks_insert_universal" ON "public"."product_stocks" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_stocks_select_universal" ON "public"."product_stocks" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "product_stocks_update_universal" ON "public"."product_stocks" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



ALTER TABLE "public"."public_menu_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_menu_items_delete_universal" ON "public"."public_menu_items" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "public_menu_items_insert_universal" ON "public"."public_menu_items" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "public_menu_items_select_public" ON "public"."public_menu_items" FOR SELECT USING ((("deleted" = false) AND ("is_visible" = true) AND (EXISTS ( SELECT 1
   FROM ("public"."public_menu_sections" "s"
     JOIN "public"."establishments" "e" ON (("e"."id" = "s"."establishment_id")))
  WHERE (("s"."id" = "public_menu_items"."section_id") AND ("s"."deleted" = false) AND ("e"."is_public" = true) AND ("e"."deleted" = false))))));



CREATE POLICY "public_menu_items_select_universal" ON "public"."public_menu_items" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "public_menu_items_update_universal" ON "public"."public_menu_items" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."public_menu_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_menu_sections_delete_universal" ON "public"."public_menu_sections" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "public_menu_sections_insert_universal" ON "public"."public_menu_sections" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "public_menu_sections_select_public" ON "public"."public_menu_sections" FOR SELECT USING ((("deleted" = false) AND (EXISTS ( SELECT 1
   FROM "public"."establishments" "e"
  WHERE (("e"."id" = "public_menu_sections"."establishment_id") AND ("e"."is_public" = true) AND ("e"."deleted" = false))))));



CREATE POLICY "public_menu_sections_select_universal" ON "public"."public_menu_sections" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "public_menu_sections_update_universal" ON "public"."public_menu_sections" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_delete_universal" ON "public"."rooms" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "rooms_insert_universal" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "rooms_select_universal" ON "public"."rooms" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "rooms_update_universal" ON "public"."rooms" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_movements_delete_universal" ON "public"."stock_movements" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "stock_movements_insert_universal" ON "public"."stock_movements" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "stock_movements_select_universal" ON "public"."stock_movements" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "stock_movements_update_universal" ON "public"."stock_movements" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."supplier_price_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_price_snapshots_delete_universal" ON "public"."supplier_price_snapshots" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_price_snapshots_insert_universal" ON "public"."supplier_price_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_price_snapshots_select_universal" ON "public"."supplier_price_snapshots" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_price_snapshots_update_universal" ON "public"."supplier_price_snapshots" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."supplier_references" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_references_delete_universal" ON "public"."supplier_references" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_references_insert_universal" ON "public"."supplier_references" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_references_select_universal" ON "public"."supplier_references" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "supplier_references_update_universal" ON "public"."supplier_references" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_delete_universal" ON "public"."suppliers" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "suppliers_insert_universal" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "suppliers_select_universal" ON "public"."suppliers" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



CREATE POLICY "suppliers_update_universal" ON "public"."suppliers" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false))))) WITH CHECK (("organization_id" IN ( SELECT "users_organizations"."organization_id"
   FROM "public"."users_organizations"
  WHERE (("users_organizations"."user_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))::"uuid") AND ("users_organizations"."deleted" = false)))));



ALTER TABLE "public"."support_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_messages_insert_universal" ON "public"."support_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "support_messages_select_universal" ON "public"."support_messages" FOR SELECT TO "authenticated" USING ((((("current_setting"('request.jwt.claims'::"text", true))::"json" -> 'app_metadata'::"text") ->> 'role'::"text") = 'system_admin'::"text"));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_delete_universal" ON "public"."support_tickets" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "support_tickets_insert_universal" ON "public"."support_tickets" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "support_tickets_select_universal" ON "public"."support_tickets" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "support_tickets_update_universal" ON "public"."support_tickets" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "system_admin_gallery_access" ON "public"."establishment_gallery" USING (true);



CREATE POLICY "system_admin_gallery_sections_access" ON "public"."establishment_gallery_sections" USING (true);



ALTER TABLE "public"."table_order_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "table_order_requests_anon_select" ON "public"."table_order_requests" FOR SELECT TO "anon" USING (true);



CREATE POLICY "table_order_requests_select" ON "public"."table_order_requests" FOR SELECT USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "table_order_requests_update" ON "public"."table_order_requests" FOR UPDATE USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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



CREATE POLICY "tables_delete_universal" ON "public"."tables" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "tables_insert_universal" ON "public"."tables" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "tables_select_universal" ON "public"."tables" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "tables_update_universal" ON "public"."tables" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



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


CREATE POLICY "vat_rate_delete_universal" ON "public"."vat_rate" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "vat_rate_insert_universal" ON "public"."vat_rate" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "vat_rate_select_universal" ON "public"."vat_rate" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "vat_rate_update_universal" ON "public"."vat_rate" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



ALTER TABLE "public"."work_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_sessions_delete_universal" ON "public"."work_sessions" FOR DELETE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "work_sessions_insert_universal" ON "public"."work_sessions" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "work_sessions_select_universal" ON "public"."work_sessions" FOR SELECT TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



CREATE POLICY "work_sessions_update_universal" ON "public"."work_sessions" FOR UPDATE TO "authenticated" USING ("public"."auth_can_access_establishment"("organization_id", "establishment_id")) WITH CHECK ("public"."auth_can_access_establishment"("organization_id", "establishment_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT ALL ON FUNCTION "public"."auth_can_access_establishment"("p_org_id" "uuid", "p_est_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_can_access_establishment"("p_org_id" "uuid", "p_est_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_can_access_establishment"("p_org_id" "uuid", "p_est_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_device_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"("days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_fifo_valorize"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fifo_valorize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fifo_valorize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lock_stock_unit"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lock_stock_unit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lock_stock_unit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_times"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_knowledge_base"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_knowledge_base"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_knowledge_base"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_jet_410_saas"("p_establishment_id" "uuid", "p_organization_id" "uuid", "p_changed_fields" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_jet_410_saas"("p_establishment_id" "uuid", "p_organization_id" "uuid", "p_changed_fields" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_jet_410_saas"("p_establishment_id" "uuid", "p_organization_id" "uuid", "p_changed_fields" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_sync_sequence_on_piece_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid", "p_device_info" "jsonb", "p_device_role" "text", "p_mods" "text"[], "p_display" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid", "p_device_info" "jsonb", "p_device_role" "text", "p_mods" "text"[], "p_display" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid", "p_device_info" "jsonb", "p_device_role" "text", "p_mods" "text"[], "p_display" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_device"("p_serial_number" "text", "p_establishment_id" "uuid", "p_organization_id" "uuid") TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_commercial_objectives" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_commercial_objectives" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_commercial_objectives" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_checklists" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_checklists" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_checklists" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_steps" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_steps" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_onboarding_steps" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoice_installments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoice_installments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoice_installments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."crm_pre_invoice_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."crm_pre_invoice_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."crm_pre_invoice_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoices" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_pre_invoices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quote_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quote_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quote_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."crm_quote_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."crm_quote_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."crm_quote_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quotes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quotes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_quotes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_subscriptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_subscriptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crm_subscriptions" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_corrections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_corrections" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_corrections" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_lines" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_lines" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_lines" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_import_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_imports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_imports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."doc_imports" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_absences" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_absences" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_absences" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_documents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_documents" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_module_access" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_module_access" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_module_access" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_monthly_reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_monthly_reports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_monthly_reports" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_permissions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_permissions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_permissions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_overrides" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_overrides" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_overrides" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_templates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_templates" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shift_templates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shifts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shifts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employee_shifts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employees" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employees" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."employees" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."employees" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_documents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_documents" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_gallery_sections" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_modules" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_modules" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."establishment_modules" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_activities" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_activities" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_activities" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_contacts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_contacts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_contacts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_tasks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_tasks" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lead_tasks" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."leads" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."leads" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."leads" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_config" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_jet" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_order_refunds" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_order_refunds" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."nf525_order_refunds" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_pools" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_pools" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_payment_pools" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."order_suites" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_modules" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_modules" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_modules" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organizations" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payment_methods" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pos_device_accounts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pos_device_accounts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pos_device_accounts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."printers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."printers" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_compositions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_values" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_values" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_group_values" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_groups" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_groups" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_option_groups" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_items" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_sections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_sections" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_menu_sections" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."rooms" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rooms" TO "e8d33df2-5a44-40b7-95c2-1b0cbc29838e";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_movements" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_price_snapshots" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_price_snapshots" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_price_snapshots" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_references" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_references" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_references" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_knowledge_base" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_knowledge_base" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_knowledge_base" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_messages" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_messages" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_messages" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_tickets" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_tickets" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."support_tickets" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."table_order_requests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."table_order_requests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."table_order_requests" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."v_stock_reconciliation" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."v_stock_reconciliation" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."v_stock_reconciliation" TO "service_role";



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
