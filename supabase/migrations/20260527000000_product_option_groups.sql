-- Groupes d'options réutilisables par établissement.
-- Remplace le modèle product_options (1 option = 1 produit) par :
--   product_option_groups        → définition du groupe (Cuisson, Taille…)
--   product_option_group_values  → choix dans le groupe (Saignante, Parmesan…)
--   product_option_group_products → assignation groupe ↔ produit (N-N)
-- RLS : même logique que les migrations existantes (JWT sub → users_organizations).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.product_option_groups (
  id                uuid          not null default gen_random_uuid(),
  establishment_id  uuid          not null,
  organization_id   uuid          not null,
  name              text          not null,
  selection_type    text          not null default 'unique',
  is_required       boolean       not null default false,
  max_selections    integer       null,
  allow_quantity    boolean       not null default false,
  display_order     integer       not null default 0,
  auto_open_modal   boolean       not null default false,
  deleted           boolean       not null default false,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  constraint product_option_groups_pkey primary key (id),
  constraint product_option_groups_establishment_fkey
    foreign key (establishment_id) references public.establishments (id),
  constraint product_option_groups_organization_fkey
    foreign key (organization_id) references public.organizations (id),
  constraint product_option_groups_selection_type_check
    check (selection_type in ('unique', 'unlimited', 'limited'))
);

create index if not exists idx_product_option_groups_establishment
  on public.product_option_groups using btree (establishment_id)
  where deleted = false;

create index if not exists idx_product_option_groups_organization
  on public.product_option_groups using btree (organization_id)
  where deleted = false;

comment on table public.product_option_groups is
  'Groupes d''options réutilisables définis au niveau établissement (Cuisson, Taille, Suppléments…).';

-- ---------------------------------------------------------------------------

create table if not exists public.product_option_group_values (
  id               uuid          not null default gen_random_uuid(),
  option_group_id  uuid          not null,
  option_name      text          not null,
  option_value     text          not null,
  option_price     numeric(10,2) not null default 0,
  tva_rate         numeric(5,2)  not null default 20,
  min_quantity     integer       null,
  max_quantity     integer       null,
  is_default       boolean       not null default false,
  is_visible       boolean       not null default true,
  display_order    integer       not null default 0,
  deleted          boolean       not null default false,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  constraint product_option_group_values_pkey primary key (id),
  constraint product_option_group_values_group_fkey
    foreign key (option_group_id) references public.product_option_groups (id) on delete cascade,
  constraint product_option_group_values_price_check check (option_price >= 0),
  constraint product_option_group_values_tva_check   check (tva_rate >= 0)
);

create index if not exists idx_product_option_group_values_group
  on public.product_option_group_values using btree (option_group_id)
  where deleted = false;

comment on table public.product_option_group_values is
  'Choix disponibles dans un groupe d''options (ex : Saignante, Parmesan, Petite 25cm).';

-- ---------------------------------------------------------------------------

create table if not exists public.product_option_group_products (
  id               uuid        not null default gen_random_uuid(),
  product_id       uuid        not null,
  option_group_id  uuid        not null,
  display_order    integer     not null default 0,
  created_at       timestamptz not null default now(),
  constraint product_option_group_products_pkey primary key (id),
  constraint product_option_group_products_product_fkey
    foreign key (product_id) references public.products (id) on delete cascade,
  constraint product_option_group_products_group_fkey
    foreign key (option_group_id) references public.product_option_groups (id) on delete cascade,
  constraint product_option_group_products_unique
    unique (product_id, option_group_id)
);

create index if not exists idx_product_option_group_products_product
  on public.product_option_group_products using btree (product_id);

create index if not exists idx_product_option_group_products_group
  on public.product_option_group_products using btree (option_group_id);

comment on table public.product_option_group_products is
  'Assignation des groupes d''options aux produits (jointure N-N).';

-- ---------------------------------------------------------------------------
-- Migration des product_options existantes
-- Crée un groupe par (product_id, establishment_id, option_group) — conservateur,
-- sans déduplication cross-produit pour éviter toute perte de données.
-- ---------------------------------------------------------------------------

do $$
declare
  v_group_id uuid;
  r          record;
begin
  for r in (
    select distinct
      product_id,
      establishment_id,
      organization_id,
      coalesce(option_group, 'Sans groupe')        as group_name,
      coalesce(max(selection_type), 'unique')      as selection_type,
      bool_or(coalesce(is_required,     false))    as is_required,
      max(max_selections)                           as max_selections,
      bool_or(coalesce(allow_quantity,  false))    as allow_quantity,
      min(display_order)                            as display_order,
      bool_or(coalesce(auto_open_modal, false))    as auto_open_modal
    from public.product_options
    where coalesce(deleted, false) = false
    group by
      product_id,
      establishment_id,
      organization_id,
      coalesce(option_group, 'Sans groupe')
  ) loop

    insert into public.product_option_groups (
      establishment_id, organization_id, name,
      selection_type, is_required, max_selections,
      allow_quantity, display_order, auto_open_modal
    ) values (
      r.establishment_id, r.organization_id, r.group_name,
      r.selection_type, r.is_required, r.max_selections,
      r.allow_quantity, r.display_order, r.auto_open_modal
    ) returning id into v_group_id;

    insert into public.product_option_group_values (
      option_group_id, option_name, option_value,
      option_price, tva_rate, min_quantity, max_quantity,
      is_default, is_visible, display_order
    )
    select
      v_group_id,
      option_name,
      option_value,
      coalesce(option_price, 0),
      coalesce(tva_rate, 20),
      min_quantity,
      max_quantity,
      coalesce(is_default, false),
      coalesce(is_visible, true),
      display_order
    from public.product_options
    where product_id       = r.product_id
      and establishment_id = r.establishment_id
      and coalesce(option_group, 'Sans groupe') = r.group_name
      and coalesce(deleted, false) = false;

    insert into public.product_option_group_products (product_id, option_group_id, display_order)
    values (r.product_id, v_group_id, r.display_order)
    on conflict (product_id, option_group_id) do nothing;

  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.product_option_groups         to authenticated;
grant select, insert, update, delete on table public.product_option_group_values   to authenticated;
grant select, insert, update, delete on table public.product_option_group_products to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — nettoyage idempotent
-- ---------------------------------------------------------------------------

do $$
declare r record;
begin
  for r in (
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'product_option_groups',
        'product_option_group_values',
        'product_option_group_products'
      )
  ) loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.product_option_groups         enable row level security;
alter table public.product_option_group_values   enable row level security;
alter table public.product_option_group_products enable row level security;

-- ---------------------------------------------------------------------------
-- RLS — product_option_groups (organization_id direct)
-- ---------------------------------------------------------------------------

create policy "product_option_groups_select" on public.product_option_groups
  for select to authenticated using (
    organization_id in (
      select uo.organization_id from public.users_organizations uo
      where uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_groups_insert" on public.product_option_groups
  for insert to authenticated with check (
    organization_id in (
      select uo.organization_id from public.users_organizations uo
      where uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_groups_update" on public.product_option_groups
  for update to authenticated
  using (
    organization_id in (
      select uo.organization_id from public.users_organizations uo
      where uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from public.users_organizations uo
      where uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_groups_delete" on public.product_option_groups
  for delete to authenticated using (
    organization_id in (
      select uo.organization_id from public.users_organizations uo
      where uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — product_option_group_values (pas de org_id direct → JOIN via groupe)
-- ---------------------------------------------------------------------------

create policy "product_option_group_values_select" on public.product_option_group_values
  for select to authenticated using (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_values.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_group_values_insert" on public.product_option_group_values
  for insert to authenticated with check (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_values.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_group_values_update" on public.product_option_group_values
  for update to authenticated
  using (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_values.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  )
  with check (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_values.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_group_values_delete" on public.product_option_group_values
  for delete to authenticated using (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_values.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — product_option_group_products (JOIN via groupe → organisation)
-- ---------------------------------------------------------------------------

create policy "product_option_group_products_select" on public.product_option_group_products
  for select to authenticated using (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_products.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_group_products_insert" on public.product_option_group_products
  for insert to authenticated with check (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_products.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );

create policy "product_option_group_products_delete" on public.product_option_group_products
  for delete to authenticated using (
    exists (
      select 1 from public.product_option_groups g
      inner join public.users_organizations uo on uo.organization_id = g.organization_id
      where g.id  = product_option_group_products.option_group_id
        and uo.user_id = (((current_setting('request.jwt.claims', true))::json ->> 'sub'))::uuid
        and uo.deleted = false
    )
  );
