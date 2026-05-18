-- ============================================================
-- CHAMPS SUPPLÉMENTAIRES SUR products
-- À exécuter dans le SQL editor Supabase
-- ============================================================

-- ─── Allergènes ──────────────────────────────────────────────────────────────
-- Tableau JSON des clés d'allergènes présents dans le produit.
-- Valeurs possibles (14 allergènes réglementaires UE/France) :
--   "gluten"       → Céréales contenant du gluten
--   "crustaceans"  → Crustacés
--   "eggs"         → Œufs
--   "fish"         → Poissons
--   "peanuts"      → Arachides
--   "soy"          → Soja
--   "milk"         → Lait (y compris lactose)
--   "nuts"         → Fruits à coque (amandes, noisettes, noix, cajou, pécan, pistache, macadamia)
--   "celery"       → Céleri
--   "mustard"      → Moutarde
--   "sesame"       → Graines de sésame
--   "sulphites"    → Dioxyde de soufre et sulfites
--   "lupin"        → Lupin
--   "molluscs"     → Mollusques
-- Exemple : '["gluten", "milk", "eggs"]'

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "allergens" jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."products"."allergens" IS
  'Tableau JSON des clés allergènes présents. Valeurs: gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs';

-- ─── Labels / régimes ────────────────────────────────────────────────────────
-- Tableau JSON des labels ou régimes alimentaires du produit.
-- Valeurs suggérées (extensibles librement) :
--   "vegetarian"   → Végétarien
--   "vegan"        → Vegan
--   "gluten_free"  → Sans gluten
--   "organic"      → Bio
--   "homemade"     → Fait maison
--   "label_rouge"  → Label Rouge
--   "aop"          → AOP / AOC / IGP
--   "halal"        → Halal
--   "kosher"       → Kasher
--   "spicy"        → Épicé
--   "very_spicy"   → Très épicé
--   "low_calorie"  → Basses calories
--   "raw"          → Cru
-- Exemple : '["vegetarian", "homemade", "gluten_free"]'

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "labels" jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."products"."labels" IS
  'Tableau JSON des labels/régimes. Valeurs suggérées: vegetarian, vegan, gluten_free, organic, homemade, label_rouge, aop, halal, kosher, spicy, very_spicy, low_calorie, raw';

-- ─── Type de produit ─────────────────────────────────────────────────────────
-- Sert à distinguer plats / boissons / ingrédients / suppléments.
-- Valeurs suggérées :
--   "dish"         → Plat (vendu à la carte)
--   "drink"        → Boisson
--   "dessert"      → Dessert
--   "starter"      → Entrée
--   "ingredient"   → Ingrédient brut (jamais vendu seul)
--   "supplement"   → Supplément / modificateur (ex: sauce supplémentaire)
--   "menu_item"    → Élément de menu composite

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "product_type" text;

COMMENT ON COLUMN "public"."products"."product_type" IS
  'Type de produit. Valeurs: dish, drink, dessert, starter, ingredient, supplement, menu_item';

-- ─── Poids / volume de la portion ────────────────────────────────────────────

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "portion_weight" numeric CHECK ("portion_weight" > 0);

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "portion_unit" text;

COMMENT ON COLUMN "public"."products"."portion_weight" IS 'Poids ou volume de la portion (ex: 200 pour 200g)';
COMMENT ON COLUMN "public"."products"."portion_unit" IS 'Unité de la portion (ex: g, kg, cl, ml, pièce)';

-- ─── Référence interne (SKU) ──────────────────────────────────────────────────

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "sku" text;

COMMENT ON COLUMN "public"."products"."sku" IS 'Référence interne / code article (SKU)';

-- ─── Food cost cible ─────────────────────────────────────────────────────────
-- Ratio coût matière / prix de vente visé (entre 0 et 1).
-- Ex: 0.30 = food cost cible de 30 %.

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "food_cost_target" numeric CHECK ("food_cost_target" > 0 AND "food_cost_target" <= 1);

COMMENT ON COLUMN "public"."products"."food_cost_target" IS 'Food cost cible (ratio 0–1, ex: 0.30 = 30%). Alerte si coût réel dépasse cette valeur.';

-- ─── Index utiles ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_products_product_type"
  ON "public"."products"("product_type")
  WHERE "deleted" = false AND "product_type" IS NOT NULL;

-- Index GIN pour recherche dans les tableaux JSON
CREATE INDEX IF NOT EXISTS "idx_products_allergens"
  ON "public"."products" USING gin("allergens");

CREATE INDEX IF NOT EXISTS "idx_products_labels"
  ON "public"."products" USING gin("labels");
