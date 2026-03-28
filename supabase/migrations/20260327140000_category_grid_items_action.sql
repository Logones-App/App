-- =============================================================================
-- category_grid_items : colonne action + contraintes cohérentes
-- =============================================================================
-- Problème fréquent (400 sur POST) : la contrainte category_grid_items_type_check
-- impose (category_id NOT NULL XOR product_id NOT NULL) sur CHAQUE ligne.
-- Les tuiles item_type = 'action' ont category_id et product_id tous les deux NULL :
-- cette contrainte les rejette. La règle métier correcte est déjà portée par
-- category_grid_items_type_coherence_chk → supprimer l’ancienne contrainte XOR.
-- =============================================================================

ALTER TABLE public.category_grid_items
  DROP CONSTRAINT IF EXISTS category_grid_items_type_check;

-- Colonne JSON (si déjà présente, no-op)
ALTER TABLE public.category_grid_items
  ADD COLUMN IF NOT EXISTS action jsonb DEFAULT '{"type": "none", "parameters": {}}'::jsonb;

COMMENT ON COLUMN public.category_grid_items.action IS 'Comportement au tap : { "type", "parameters" }';

-- item_type inclut action (idempotent si identique)
ALTER TABLE public.category_grid_items
  DROP CONSTRAINT IF EXISTS category_grid_items_item_type_check;

ALTER TABLE public.category_grid_items
  ADD CONSTRAINT category_grid_items_item_type_check
  CHECK (item_type = ANY (ARRAY['product'::text, 'category'::text, 'action'::text]));
