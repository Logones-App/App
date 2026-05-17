-- Permettre le même couple (plat, ingrédient) deux fois : une fois en recette (BOM de base),
-- une fois en modifier (extras en perso), ex. burger avec 2 steaks en recette + ligne « +N steaks ».
-- Ancienne contrainte unique (main, component) bloquait ce cas métier.

alter table public.product_compositions
  drop constraint if exists unique_composition;

-- Une seule ligne recette et une seule ligne modifier par triplet (établissement, plat, composant) parmi les lignes actives.
create unique index if not exists product_compositions_unique_main_component_kind_establishment
  on public.product_compositions (establishment_id, main_product_id, component_product_id, composition_kind)
  where
    coalesce(deleted, false) = false;

comment on index public.product_compositions_unique_main_component_kind_establishment is
  'Unicité logique : même ingrédient peut exister en recipe (ex. 2 steaks inclus) et en modifier (steaks supplémentaires), par établissement. Les lignes deleted=true ne participent pas à l''unicité.';
