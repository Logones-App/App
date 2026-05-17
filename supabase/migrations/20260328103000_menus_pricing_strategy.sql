-- Stratégie de prix sur public.menus (table existante). Aucune nouvelle table : les lignes menu–produit restent dans
-- public.menus_products (price, products_id, menus_id, …). Prix catalogue sur public.products.

alter table public.menus
  add column if not exists pricing_strategy text;

update public.menus
set
  pricing_strategy = 'menu_price_fallback_catalog'
where
  pricing_strategy is null;

alter table public.menus
  alter column pricing_strategy set default 'menu_price_fallback_catalog';

alter table public.menus
  alter column pricing_strategy set not null;

do $$
begin
  alter table public.menus add constraint menus_pricing_strategy_check check (
    pricing_strategy in (
      'catalog_only',
      'menu_price_fallback_catalog',
      'menu_price_required'
    )
  );
exception
  when duplicate_object then null;
end
$$;

comment on column public.menus.pricing_strategy is
  'catalog_only: toujours le prix produit. menu_price_fallback_catalog: prix ligne menu si non null, sinon catalogue. menu_price_required: prix ligne menu obligatoire (sinon repli catalogue côté appli en attendant correction).';
