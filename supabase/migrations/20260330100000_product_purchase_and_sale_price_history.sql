-- Historique coût d'achat (organisation / établissement optionnel) + historique prix de vente par ligne menu (menus_products).
-- RLS : même logique que scripts/create-devices-policies.sql (JWT sub → users_organizations → establishments).
-- Si une ancienne version a créé product_sale_price_history (prix catalogue), elle est supprimée ici.

drop table if exists public.product_sale_price_history cascade;

-- ---------------------------------------------------------------------------
-- Coût d'achat
-- ---------------------------------------------------------------------------

create table if not exists public.product_purchase_price_history (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  organization_id uuid not null,
  establishment_id uuid null,
  unit_cost numeric(14, 4) not null,
  currency text not null default 'EUR'::text,
  effective_from timestamp with time zone not null default now(),
  supplier_ref text null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  constraint product_purchase_price_history_pkey primary key (id),
  constraint product_purchase_price_history_product_id_fkey foreign key (product_id) references public.products (id) on delete cascade,
  constraint product_purchase_price_history_organization_id_fkey foreign key (organization_id) references public.organizations (id),
  constraint product_purchase_price_history_establishment_id_fkey foreign key (establishment_id) references public.establishments (id),
  constraint product_purchase_price_history_unit_cost_check check (unit_cost >= (0)::numeric)
);

create index if not exists idx_product_purchase_price_history_product_effective on public.product_purchase_price_history using btree (
  product_id,
  effective_from desc
);

create index if not exists idx_product_purchase_price_history_org_product on public.product_purchase_price_history using btree (organization_id, product_id);

create index if not exists idx_product_purchase_price_history_establishment on public.product_purchase_price_history using btree (establishment_id)
where
  establishment_id is not null;

comment on table public.product_purchase_price_history is
  'Snapshots du coût d''achat unitaire par produit. establishment_id null = coût au niveau organisation.';

comment on column public.product_purchase_price_history.unit_cost is
  'Coût pour une unité alignée avec le produit / stock (ex. product_stocks.unit).';

-- ---------------------------------------------------------------------------
-- Prix de vente : historique par ligne menus_products (prix menu, référence métier)
-- ---------------------------------------------------------------------------

create table if not exists public.menus_products_price_history (
  id uuid not null default gen_random_uuid (),
  menus_products_id uuid not null,
  sale_price numeric(12, 2) not null,
  currency text not null default 'EUR'::text,
  effective_from timestamp with time zone not null default now(),
  source text null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  constraint menus_products_price_history_pkey primary key (id),
  constraint menus_products_price_history_menus_products_id_fkey foreign key (menus_products_id) references public.menus_products (id) on delete cascade,
  constraint menus_products_price_history_sale_price_check check (sale_price >= (0)::numeric)
);

create index if not exists idx_menus_products_price_history_mp_effective on public.menus_products_price_history using btree (
  menus_products_id,
  effective_from desc
);

comment on table public.menus_products_price_history is
  'Évolution du prix de vente pour chaque ligne menus_products (grille / menu par établissement).';

comment on column public.menus_products_price_history.source is
  'Ex. grid_ui, bulk_catalog_sync, import — pour filtrer les séries.';

-- ---------------------------------------------------------------------------
-- Droits API
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.product_purchase_price_history to authenticated;

grant select, insert, update, delete on table public.menus_products_price_history to authenticated;

-- ---------------------------------------------------------------------------
-- RLS : recréation des policies (drop puis create)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in (
    select
      policyname,
      tablename
    from
      pg_policies
    where
      schemaname = 'public'
      and tablename in (
        'product_purchase_price_history',
        'menus_products_price_history'
      )
  ) loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end
$$;

alter table public.product_purchase_price_history enable row level security;

alter table public.menus_products_price_history enable row level security;

-- product_purchase_price_history : membre org + si establishment_id, établissement accessible

create policy "product_purchase_price_history_select_universal" on public.product_purchase_price_history for select to authenticated using (
  organization_id in (
    select
      uo.organization_id
    from
      public.users_organizations uo
    where
      uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
  )
  and (
    establishment_id is null
    or establishment_id in (
      select
        e.id
      from
        public.establishments e
        inner join public.users_organizations uo on uo.organization_id = e.organization_id
      where
        uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
        and uo.deleted = false
        and e.deleted = false
    )
  )
);

create policy "product_purchase_price_history_insert_universal" on public.product_purchase_price_history for insert to authenticated with check (
  organization_id in (
    select
      uo.organization_id
    from
      public.users_organizations uo
    where
      uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
  )
  and (
    establishment_id is null
    or establishment_id in (
      select
        e.id
      from
        public.establishments e
        inner join public.users_organizations uo on uo.organization_id = e.organization_id
      where
        uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
        and uo.deleted = false
        and e.deleted = false
    )
  )
);

create policy "product_purchase_price_history_update_universal" on public.product_purchase_price_history for update to authenticated using (
  organization_id in (
    select
      uo.organization_id
    from
      public.users_organizations uo
    where
      uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
  )
  and (
    establishment_id is null
    or establishment_id in (
      select
        e.id
      from
        public.establishments e
        inner join public.users_organizations uo on uo.organization_id = e.organization_id
      where
        uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
        and uo.deleted = false
        and e.deleted = false
    )
  )
)
with check (
  organization_id in (
    select
      uo.organization_id
    from
      public.users_organizations uo
    where
      uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
  )
  and (
    establishment_id is null
    or establishment_id in (
      select
        e.id
      from
        public.establishments e
        inner join public.users_organizations uo on uo.organization_id = e.organization_id
      where
        uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
        and uo.deleted = false
        and e.deleted = false
    )
  )
);

create policy "product_purchase_price_history_delete_universal" on public.product_purchase_price_history for delete to authenticated using (
  organization_id in (
    select
      uo.organization_id
    from
      public.users_organizations uo
    where
      uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
  )
  and (
    establishment_id is null
    or establishment_id in (
      select
        e.id
      from
        public.establishments e
        inner join public.users_organizations uo on uo.organization_id = e.organization_id
      where
        uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
        and uo.deleted = false
        and e.deleted = false
    )
  )
);

-- menus_products_price_history : accès si la ligne menus_products appartient à un établissement autorisé (comme devices)

create policy "menus_products_price_history_select_universal" on public.menus_products_price_history for select to authenticated using (
  exists (
    select
      1
    from
      public.menus_products mp
      inner join public.establishments e on e.id = mp.establishment_id
      inner join public.users_organizations uo on uo.organization_id = e.organization_id
    where
      mp.id = menus_products_price_history.menus_products_id
      and uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
      and e.deleted = false
  )
);

create policy "menus_products_price_history_insert_universal" on public.menus_products_price_history for insert to authenticated with check (
  exists (
    select
      1
    from
      public.menus_products mp
      inner join public.establishments e on e.id = mp.establishment_id
      inner join public.users_organizations uo on uo.organization_id = e.organization_id
    where
      mp.id = menus_products_price_history.menus_products_id
      and uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
      and e.deleted = false
  )
);

create policy "menus_products_price_history_update_universal" on public.menus_products_price_history for update to authenticated using (
  exists (
    select
      1
    from
      public.menus_products mp
      inner join public.establishments e on e.id = mp.establishment_id
      inner join public.users_organizations uo on uo.organization_id = e.organization_id
    where
      mp.id = menus_products_price_history.menus_products_id
      and uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
      and e.deleted = false
  )
)
with check (
  exists (
    select
      1
    from
      public.menus_products mp
      inner join public.establishments e on e.id = mp.establishment_id
      inner join public.users_organizations uo on uo.organization_id = e.organization_id
    where
      mp.id = menus_products_price_history.menus_products_id
      and uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
      and e.deleted = false
  )
);

create policy "menus_products_price_history_delete_universal" on public.menus_products_price_history for delete to authenticated using (
  exists (
    select
      1
    from
      public.menus_products mp
      inner join public.establishments e on e.id = mp.establishment_id
      inner join public.users_organizations uo on uo.organization_id = e.organization_id
    where
      mp.id = menus_products_price_history.menus_products_id
      and uo.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid
      and uo.deleted = false
      and e.deleted = false
  )
);
