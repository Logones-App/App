-- ============================================================
-- GESTION DES FOURNISSEURS — Option B complète
-- À exécuter dans le SQL editor Supabase
-- ============================================================

-- ─── 1. TABLE suppliers ──────────────────────────────────────────────────────

CREATE TABLE "public"."suppliers" (
  "id"              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "organization_id" uuid        NOT NULL REFERENCES "public"."organizations"("id"),
  "name"            text        NOT NULL,
  "contact_name"    text,
  "email"           text,
  "phone"           text,
  "address"         text,
  "website"         text,
  "notes"           text,
  "is_active"       boolean     NOT NULL DEFAULT true,
  "deleted"         boolean     NOT NULL DEFAULT false,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz,
  "created_by"      uuid        REFERENCES auth.users("id")
);

COMMENT ON TABLE "public"."suppliers" IS 'Catalogue des fournisseurs, scoped par organisation.';
COMMENT ON COLUMN "public"."suppliers"."is_active" IS 'Désactiver un fournisseur le masque des selects sans le supprimer.';

-- ─── 2. TABLE product_suppliers ──────────────────────────────────────────────

CREATE TABLE "public"."product_suppliers" (
  "id"                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "product_id"            uuid        NOT NULL REFERENCES "public"."products"("id"),
  "supplier_id"           uuid        NOT NULL REFERENCES "public"."suppliers"("id"),
  "organization_id"       uuid        NOT NULL REFERENCES "public"."organizations"("id"),
  "supplier_product_ref"  text,
  "supplier_product_name" text,
  "order_unit"            text,
  "order_quantity"        numeric     CHECK ("order_quantity" > 0),
  "lead_time_days"        integer     CHECK ("lead_time_days" >= 0),
  "is_preferred"          boolean     NOT NULL DEFAULT false,
  "notes"                 text,
  "deleted"               boolean     NOT NULL DEFAULT false,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz,
  "created_by"            uuid        REFERENCES auth.users("id"),

  UNIQUE ("product_id", "supplier_id")
);

COMMENT ON TABLE "public"."product_suppliers" IS 'Liaison produit ↔ fournisseur avec conditions d''approvisionnement.';
COMMENT ON COLUMN "public"."product_suppliers"."is_preferred" IS 'Fournisseur principal pour ce produit.';
COMMENT ON COLUMN "public"."product_suppliers"."order_unit" IS 'Unité de commande (ex: kg, caisse 6x, carton 12x).';

-- ─── 3. EXTENSION product_purchase_price_history ─────────────────────────────

ALTER TABLE "public"."product_purchase_price_history"
  ADD COLUMN IF NOT EXISTS "supplier_id" uuid REFERENCES "public"."suppliers"("id");

COMMENT ON COLUMN "public"."product_purchase_price_history"."supplier_id" IS 'FK fournisseur. Prioritaire sur supplier_ref textuel.';

-- ─── 4. INDEX ────────────────────────────────────────────────────────────────

CREATE INDEX "idx_suppliers_organization_id"
  ON "public"."suppliers"("organization_id")
  WHERE "deleted" = false;

CREATE INDEX "idx_suppliers_active"
  ON "public"."suppliers"("organization_id", "name")
  WHERE "deleted" = false AND "is_active" = true;

CREATE INDEX "idx_product_suppliers_product_id"
  ON "public"."product_suppliers"("product_id")
  WHERE "deleted" = false;

CREATE INDEX "idx_product_suppliers_supplier_id"
  ON "public"."product_suppliers"("supplier_id")
  WHERE "deleted" = false;

CREATE INDEX "idx_product_suppliers_organization_id"
  ON "public"."product_suppliers"("organization_id")
  WHERE "deleted" = false;

CREATE INDEX "idx_purchase_price_supplier_id"
  ON "public"."product_purchase_price_history"("supplier_id")
  WHERE "supplier_id" IS NOT NULL;

-- ─── 5. TRIGGERS updated_at ──────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER "update_suppliers_updated_at"
  BEFORE UPDATE ON "public"."suppliers"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE OR REPLACE TRIGGER "update_product_suppliers_updated_at"
  BEFORE UPDATE ON "public"."product_suppliers"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- ─── 6. RLS — suppliers ──────────────────────────────────────────────────────

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select_universal"
  ON "public"."suppliers"
  FOR SELECT TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "suppliers_insert_universal"
  ON "public"."suppliers"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "suppliers_update_universal"
  ON "public"."suppliers"
  FOR UPDATE TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  )
  WITH CHECK (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "suppliers_delete_universal"
  ON "public"."suppliers"
  FOR DELETE TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

-- ─── 7. RLS — product_suppliers ──────────────────────────────────────────────

ALTER TABLE "public"."product_suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_suppliers_select_universal"
  ON "public"."product_suppliers"
  FOR SELECT TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "product_suppliers_insert_universal"
  ON "public"."product_suppliers"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "product_suppliers_update_universal"
  ON "public"."product_suppliers"
  FOR UPDATE TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  )
  WITH CHECK (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

CREATE POLICY "product_suppliers_delete_universal"
  ON "public"."product_suppliers"
  FOR DELETE TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "users_organizations"."organization_id"
      FROM "public"."users_organizations"
      WHERE (
        "users_organizations"."user_id" = (("current_setting"('request.jwt.claims'::text, true))::json ->> 'sub'::text)::uuid
        AND "users_organizations"."deleted" = false
      )
    )
  );

-- ─── 8. GRANTS ───────────────────────────────────────────────────────────────

GRANT ALL ON "public"."suppliers" TO "authenticated";
GRANT ALL ON "public"."suppliers" TO "service_role";

GRANT ALL ON "public"."product_suppliers" TO "authenticated";
GRANT ALL ON "public"."product_suppliers" TO "service_role";
