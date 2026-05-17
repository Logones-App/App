-- Au plus un des deux modes de prix sur une ligne de composition (cohérent avec l'UI dashboard produit).
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'product_compositions'
      and c.conname = 'product_compositions_supplement_price_xor_check'
      and c.contype = 'c'
  ) then
    alter table public.product_compositions
      add constraint product_compositions_supplement_price_xor_check
      check (
        not (
          unit_supplement_price is not null
          and price_multiplier is not null
        )
      );
  end if;
end $$;

comment on constraint product_compositions_supplement_price_xor_check on public.product_compositions is
  'Interdit d''avoir à la fois unit_supplement_price et price_multiplier (exclusion mutuelle).';
