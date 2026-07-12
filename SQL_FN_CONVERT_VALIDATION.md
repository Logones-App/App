# SQL — `fn_convert` canonique + validation du `conversion_factor` (en FLAG)

_Socle partagé POS ↔ SaaS. Principe convergé : la garde **dure** est côté **app** (à la création de référence, sur les deux clients) ; la base **flague** (`needs_review`), **jamais reject** — car `supplier_references` **et** `stock_movements` sont sync-offline chez le POS (un reject bloquerait une ligne créée hors ligne → orphelines/divergence)._

## 1. `fn_convert` — conversion d'unités canonique, STRICTE

Miroir exact de `src/lib/utils/unit-conversion.ts` (`UNIT_FACTORS`). Retourne **NULL** si non convertible (unités de catégories différentes ou inconnues). Identité si unités égales ou nulles.

```sql
create or replace function public.fn_convert(p_value numeric, p_from text, p_to text)
returns numeric
language sql
immutable
as $$
  select case
    when p_from is null or p_to is null           then p_value      -- pas d'unité → identité (comme le helper)
    when lower(p_from) = lower(p_to)               then p_value
    when lower(p_from)||'_'||lower(p_to) = 'kg_g'  then p_value * 1000
    when lower(p_from)||'_'||lower(p_to) = 'g_kg'  then p_value * 0.001
    when lower(p_from)||'_'||lower(p_to) = 'l_ml'  then p_value * 1000
    when lower(p_from)||'_'||lower(p_to) = 'ml_l'  then p_value * 0.001
    when lower(p_from)||'_'||lower(p_to) = 'l_cl'  then p_value * 100
    when lower(p_from)||'_'||lower(p_to) = 'cl_l'  then p_value * 0.01
    when lower(p_from)||'_'||lower(p_to) = 'cl_ml' then p_value * 10
    when lower(p_from)||'_'||lower(p_to) = 'ml_cl' then p_value * 0.1
    else null                                                        -- non convertible → NULL (strict)
  end;
$$;
```

### Table de cas (pour le test de concordance POS ↔ SaaS)
`fn_convert(1, from, to)` doit égaler `convertUnit(1, from, to)` de `unit-conversion.ts` :

| from | to | attendu |
|---|---|---|
| kg | g | 1000 |
| g | kg | 0.001 |
| l | ml | 1000 |
| ml | l | 0.001 |
| l | cl | 100 |
| cl | l | 0.01 |
| cl | ml | 10 |
| ml | cl | 0.1 |
| kg | kg | 1 |
| piece | piece | 1 |
| kg | l | **NULL** (masse↔volume) |
| kg | piece | **NULL** |
| Carton | piece | **NULL** (unité inconnue) |
| NULL | g | 1 (identité) |

> Côté app, `suggestConversionFactor(from, to)` = `fn_convert(1, from, to)` mais **null si ≤ 0 ou null** (usage validation).

## 2. Corriger le commentaire schéma (le code faisait foi, pas le commentaire)

```sql
comment on column public.supplier_references.conversion_factor is
  'Nombre d''unités de stock (portion_unit du produit) contenues dans 1 unité de commande (order_unit). '
  'Ex : 1 kg = 1000 g → 1000. Doit valoir fn_convert(1, order_unit, stock_unit) quand les unités sont convertibles.';
```

## 3. Validation en FLAG (jamais reject)

### 3a. `stock_movements` — point de validation FIABLE (l'unité de stock y est résoluble)
Au moment où un mouvement d'achat utilise une référence, on connaît `product_stock_id → unit`. On compare le facteur de la référence à la conversion réelle ; incohérent ⇒ `needs_review = true`. **BEFORE INSERT** → fire aussi à la **sync des lignes POS**, sans jamais bloquer.

```sql
create or replace function public.fn_flag_factor_mismatch()
returns trigger language plpgsql as $$
declare v_order_unit text; v_factor numeric; v_stock_unit text; v_expected numeric; v_packaging text;
begin
  if new.movement_type <> 'purchase' or new.supplier_reference_id is null then
    return new;
  end if;
  select order_unit, conversion_factor, packaging into v_order_unit, v_factor, v_packaging
    from supplier_references where id = new.supplier_reference_id;
  -- Colisage compté (Boîte/Sac/Sachet/Plaquette…) : le facteur = nb d'unités par colis,
  -- PAS une conversion dimensionnelle → rien à valider (ex. 1 boîte = 25 sachets, order=stock='piece').
  if v_packaging is not null then
    return new;
  end if;
  select unit into v_stock_unit from product_stocks where id = new.product_stock_id;

  v_expected := public.fn_convert(1, v_order_unit, v_stock_unit);
  -- unités convertibles ET facteur ≠ conversion réelle → on FLAGue (ne bloque pas)
  if v_expected is not null and v_factor is not null and abs(v_expected - v_factor) > 1e-6 then
    new.needs_review := true;
  end if;
  return new;
end $$;

create or replace trigger trg_flag_factor_mismatch
  before insert on public.stock_movements
  for each row execute function public.fn_flag_factor_mismatch();
```

### 3b. `supplier_references` — flag à la source (l'unité de stock doit être RÉSOLUE)
Principe (accord POS) : **un facteur n'a de sens qu'avec une unité de stock résolue.** Prérequis : une colonne de flag.

```sql
alter table public.supplier_references
  add column if not exists needs_review boolean not null default false;
```

Trigger de flag (BEFORE INSERT/UPDATE) — flague si (a) une unité de stock est résoluble pour ce produit **et** le facteur diverge, **ou** (b) un facteur non-NULL est posé alors qu'aucune unité de stock n'est résoluble (facteur « dans le vide ») :

```sql
create or replace function public.fn_flag_ref_factor()
returns trigger language plpgsql as $$
declare v_stock_unit text; v_expected numeric;
begin
  -- Colisage compté (Boîte/Sac/Sachet/Plaquette…) : le facteur = nb d'unités par colis,
  -- PAS une conversion dimensionnelle → rien à valider (ex. 1 boîte = 25 sachets, order=stock='piece').
  if new.packaging is not null then
    new.needs_review := false;
    return new;
  end if;
  if new.conversion_factor is null or new.order_unit is null then
    new.needs_review := false;
    return new;
  end if;
  -- Unité de stock = attribut PRODUIT (org-level, valeur unique posée une fois), pas une ligne
  -- product_stocks par établissement → pas de limit 1 ambigu (reco POS). Flag-not-reject en
  -- filet si portion_unit pas encore posé (v_stock_unit NULL).
  select portion_unit into v_stock_unit from products where id = new.product_id;

  v_expected := public.fn_convert(1, new.order_unit, v_stock_unit);
  -- SET DÉTERMINISTE (true OU false) → corriger une réf efface le flag automatiquement.
  -- (a) convertible et divergent → flag ; (b) facteur posé sans unité résoluble → flag
  new.needs_review := (v_expected is not null and abs(v_expected - new.conversion_factor) > 1e-6)
                      or (v_stock_unit is null);
  return new;
end $$;

create or replace trigger trg_flag_ref_factor
  before insert or update on public.supplier_references
  for each row execute function public.fn_flag_ref_factor();
```

> ✅ Point tranché (POS) : l'unité de stock est un **attribut produit** (`products.portion_unit`, posé une fois, non écrasé) ; `product_stocks.unit` en dérive et est normalement **identique** pour un produit donné. On résout donc via `products.portion_unit` (valeur unique org-level) → plus d'ambiguïté `limit 1`. Flag-not-reject en filet si `portion_unit` pas encore posé.

### 3c. (optionnel partagé) cohérence `movement.unit == product_stocks.unit` — EN FLAG
```sql
-- dans fn_flag_factor_mismatch (ou un trigger jumeau) :
--   if new.unit is distinct from v_stock_unit then new.needs_review := true; end if;
```

## 4. Réparation de l'existant
```sql
-- Références au facteur incohérent (à re-dériver côté app via « Modifier ») :
-- unité de stock résolue via products.portion_unit (org-level, cohérent avec fn_flag_ref_factor).
select sr.id, sr.order_unit, sr.conversion_factor,
       p.portion_unit as stock_unit, public.fn_convert(1, sr.order_unit, p.portion_unit) as expected
from supplier_references sr
join products p on p.id = sr.product_id
where sr.deleted = false
  and public.fn_convert(1, sr.order_unit, p.portion_unit) is not null
  and abs(public.fn_convert(1, sr.order_unit, p.portion_unit) - sr.conversion_factor) > 1e-6;

-- Stocks dérivés (drift) : cf. vue existante v_stock_reconciliation (has_drift).
```

## 5. Côté app (déjà fait, SaaS)
- **Fermé le champ facteur libre** au doc-import : le facteur est **dérivé** de `fn_convert(1, order_unit, portion_unit)` quand l'unité de stock est connue (nouvel ingrédient) ; sinon provisoire — plus de « 180 » saisi à la main. (`doc-line-create-modal.tsx`)
- **`computeReferenceUnits` durci** : plus de repli silencieux sur unités incompatibles (flag `conversionOk` → avertissement UI). (`reception-modal-parts.tsx` / `-fields.tsx`)
- **Alerte réception** si le facteur d'une réf ≠ conversion réelle. (`AmountsFields`)

## Test de concordance (SaaS FAIT — symétrique pour le POS)
La **table de cas canonique** vit désormais dans le code : `src/lib/utils/unit-conversion-cases.ts`
(`CONVERSION_CASES` + `checkConversionConcordance()`) — miroir exact de la table §1. Un runner
`scripts/check-unit-conversion.ts` la joue contre `convertUnit` :

```
npm run check:unit-conversion     # ✅ 14 cas, exit 0 si concordance
```

→ Le POS écrit le **même test** contre `fn_convert` (mêmes 14 cas). Tant que les deux passent, les
implémentations TS et SQL ne peuvent pas diverger. (Ajouter un cas = l'ajouter des deux côtés.)
