# Plan d'exécution — TVA scoppée par ORGANISATION

_Suite de `ETAT_LIEUX_VAT_ORG_SCOPING.md`. Décision : GO (Phil, 2026-07-13). Migration **gated POS**
(modèle + RLS partagés) → **rien de destructif ne tourne avant leur feu vert**. Cible : `vat_rate`
scoppé org, dédupliqué, RLS org-scope._

## ✅ ÉTAT (2026-07-13) — DB migrée
- **Bloc 1 (backfill+dédup)** exécuté : `vat_rate` **12 → 7 actives**, **204 produits + 1 catégorie** repointés,
  0 orphelin, `establishment_id` passé nullable, 0 doublon (org,value) restant.
- **Bloc 2 (RLS)** exécuté : helpers `auth_can_access_organization` (SELECT, toute appartenance = POS)
  + `auth_is_org_admin` (INSERT/UPDATE/DELETE, org-admin org-level) ; 4 policies `vat_rate_*_universal` réécrites.
- **Code SaaS** écrit et compilé (tsc + lint clean) : hook `useOrganizationVatRates` + 7 consommateurs,
  `establishment_id` nullable dans les types, seed TVA **déplacé à la création d'ORGA** (`ensureOrgVatRates`
  + `DEFAULT_ORG_VAT_RATES` dans `establishment-provisioning.ts`, appelé dans `api/admin/organizations`
  + `createOrg` de la conversion lead), étape « Taux TVA » **retirée** des 2 wizards de création établissement.
- **RESTE** : (1) commit + déploiement du bundle code SaaS ; (2) **resync `vat_rate` sur les devices POS**
  (table lazy — un device déjà synchro garde l'ancien cache). Le SQL exécuté est archivé ci-dessous.

## Ordre d'exécution (strict)
1. **POS — feu vert** (message ci-dessous) : ils lisent `vat_rate` et dépendent des policies RLS
   établissement. Ils doivent (a) valider l'org-scope, (b) basculer leur lecture sur `organization_id`,
   (c) confirmer que la **dédup** ne casse aucune référence de leur côté, (d) caler la fenêtre.
2. **DB — backfill + RLS** (SQL ci-dessous), sur fenêtre contrôlée, **après (1)**.
3. **Code SaaS** — hook central + ~10 consommateurs + refonte seed org + 2 flux création.
4. **Tests** — sélecteurs TVA (produits/catégories/menu), création établissement/lead, ma feature grille,
   reporting (doit être inchangé).
5. **Re-dump** + retrait des fichiers d'état des lieux/plan une fois livré.

---

## Étape 2 — Backfill DB (⚠️ DRAFT, à relire + exécuter post-POS, fenêtre contrôlée)

```sql
-- 0) Photo avant (attendu ~12 lignes actives)
select count(*) from vat_rate where deleted = false;

-- 1) Remplir organization_id manquant depuis l'établissement
update vat_rate v
set organization_id = e.organization_id
from establishments e
where v.establishment_id = e.id and v.organization_id is null;

-- 2) Repoint PRODUCTS vers la ligne canonique (1 par (org, valeur), la plus ancienne)
with canon as (
  select distinct on (organization_id, value) id as canonical_id, organization_id, value
  from vat_rate where deleted = false
  order by organization_id, value, created_at asc, id asc
)
update products p
set vat_rate_id = c.canonical_id
from vat_rate v
join canon c on c.organization_id = v.organization_id and c.value = v.value
where p.vat_rate_id = v.id and v.id <> c.canonical_id;

-- 3) Repoint CATEGORIES (même canon)
with canon as (
  select distinct on (organization_id, value) id as canonical_id, organization_id, value
  from vat_rate where deleted = false
  order by organization_id, value, created_at asc, id asc
)
update categories cat
set vat_rate_id = c.canonical_id
from vat_rate v
join canon c on c.organization_id = v.organization_id and c.value = v.value
where cat.vat_rate_id = v.id and v.id <> c.canonical_id;

-- 3bis) category_grid_items.vat_rate_id : VÉRIFIER s'il est utilisé (pas de FK) ; repoint si oui.

-- 4) Soft-delete les doublons (on garde les canoniques)
with canon as (
  select distinct on (organization_id, value) id
  from vat_rate where deleted = false
  order by organization_id, value, created_at asc, id asc
)
update vat_rate v set deleted = true
where v.deleted = false and v.id not in (select id from canon);

-- 5) Photo après (attendu ~7 lignes actives) + 0 produit/catégorie orphelin
select count(*) from vat_rate where deleted = false;
select count(*) from products p join vat_rate v on v.id=p.vat_rate_id
  where p.deleted=false and v.deleted=true;   -- doit = 0

-- 6) Rendre establishment_id facultatif (org-scope)
alter table public.vat_rate alter column establishment_id drop not null;
-- (option) marquer les survivants org-level : update vat_rate set establishment_id = null where deleted=false;
```

### RLS org-scope (coordonné POS — ils dépendent des mêmes policies)
```sql
-- Helper org — miroir de auth_can_access_establishment, MAIS true pour TOUTE appartenance à l'org.
-- ⚠️ POS (point C) : le user POS est ÉTABLISSEMENT-LIÉ (users_organizations.establishment_id NOT NULL) ;
-- il DOIT passer dès qu'il a UNE ligne sur l'org → on ne filtre PAS sur establishment_id IS NULL.
create or replace function public.auth_can_access_organization(p_org_id uuid)
  returns boolean language sql stable security definer set search_path to 'public' as $$
  select
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role') = 'system_admin'
    or exists (
      select 1 from public.users_organizations uo
      where uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
        and uo.deleted = false
        and uo.organization_id = p_org_id      -- toute appartenance à l'org (org-level OU établissement-lié)
    );
$$;
revoke all on function public.auth_can_access_organization(uuid) from public, anon;
grant execute on function public.auth_can_access_organization(uuid) to authenticated, service_role;

-- Réécrire les 4 policies vat_rate_*_universal :
--   SELECT  → auth_can_access_organization(organization_id)   [toute appartenance ; le POS en dépend]
--   INSERT/UPDATE/DELETE → check ORG-ADMIN (gouvernance POS) : users_organizations org-level
--     (establishment_id IS NULL + role org_admin) OU system_admin — pas « toute appartenance »
--     (sinon un manager pourrait éditer les taux org partagés).
```

### ⚠️ ATOMICITÉ backfill (point B POS — CRITIQUE)
Le POS résout `vat_rate_id → value` à la volée et **exclut les rows `deleted=true`**. Donc un produit
pointant encore sur un doublon soft-deleté ⇒ **résolution ratée ⇒ 0 %** sur la pièce signée.
→ Le **repoint (products + categories + category_grid_items) doit être COMPLET et dans la MÊME
transaction que le soft-delete**, avec une **assertion** avant COMMIT :
```sql
begin;
  -- ... étapes 2,3,3bis (repoint) ...
  -- garde-fou : AUCUN produit/catégorie actif ne doit pointer sur une row qui va être supprimée
  do $$ begin
    if exists (
      select 1 from products p join vat_rate v on v.id=p.vat_rate_id
      where p.deleted=false and v.id not in (
        select distinct on (organization_id, value) id from vat_rate where deleted=false
        order by organization_id, value, created_at asc, id asc)
    ) then raise exception 'Repoint incomplet : produits encore liés à un doublon'; end if;
  end $$;
  -- ... étape 4 (soft-delete) ...
commit;
```

---

## Étape 3 — Code SaaS (checklist)

**Hook central (1)**
- [ ] `establishments-related-queries.ts:187` — `useEstablishmentVatRates(establishmentId)` →
  `useOrganizationVatRates(organizationId)` : `.eq("organization_id", organizationId)`. Renommer + re-export
  `establishments/index.ts:12`.

**Consommateurs (~10) — passer organizationId au lieu de establishmentId**
- [ ] doc-line-create-modal · composition-add-modal · product-category-dialogs · product-new-wizard ·
  product-dashboard-propriete-form · product-option-groups-config · product-option-group-dialogs ·
  product-base-fields · menu-products-grid-panel (feature grille).

**Seed org au lieu d'établissement**
- [ ] `establishment-provisioning.ts:148` — `insertVatRates` : ne plus insérer par établissement ;
  **seeder par ORG, idempotent** (skip si l'org a déjà ses taux). Décider l'emplacement du seed :
  à la **création d'ORG** (route admin orgs + `createOrg` de la conversion lead).
- [ ] `create-establishment-modal.tsx` — retirer/adapter l'étape « Taux TVA » (`DEFAULT_VAT`,
  `MANDATORY_VAT`, libellé « …de cet établissement »).
- [ ] `convert-lead-modal.tsx` / `convert-lead-steps.tsx` — idem (étape `StepVat` dupliquée).
- [ ] Reporter la validation `MANDATORY_VAT=[10,20]` au niveau **org**.

**Inchangé (vérifier au test)**
- Lectures FK valeur : product-establishment-dashboard, establishments-menu-queries (grille), menu-utils
  (carte publique). Écritures de `vat_rate_id` (pointeront vers le taux org). Reporting (valeur sur ventes).

---

## Raffinements POS intégrés (A→E, vérifiés en base)
- **A** POS bascule sa lecture sur `organization_id` (1 ligne de config) — OK.
- **B** repoint AVANT/ATOMIQUE avec le soft-delete + assertion (ci-dessus).
- **C** helper `auth_can_access_organization` true pour user **établissement-lié** (ci-dessus).
- **D** POS pré-déployable (inerte avant bascule) ; **prévoir un resync `vat_rate` des devices** après
  bascule (table LAZY : un device déjà synchro ne rafraîchit pas seul).
- **E1** — 12 produits sans `vat_rate_id` dans l'org **`d0bc236f`** (PAS l'org d'audit `82f66d07`, clean).
  Quasi tous des **ingrédients** (Aubergine, Banane, Beurre, Épinards, Fraises, Kiwi…) + « Tartiflette ».
  → **Hors migration org-scope** (ça ne crée pas de TVA) : cleanup séparé = assigner un taux aux
  **sellables** parmi eux. Filet POS (E6) : ne jamais signer 0 % sur un `vat_rate_id` non résolu.
- **E2** match au repoint sur `value` **numérique** (colonne numeric) → pas de piège "5.5"/"5.50". ✅
- **E4** `vat_assoc_id` : uniquement sur `vat_rate`, **référencé nulle part ailleurs** → dédup sûre
  (la canonique garde le sien). ✅
- **E5** `product_option_group_values.tva_rate` : **0** option à 0/NULL → clean. ✅

## Bénéfice attendu
- Un seul jeu de taux par org ; `products.vat_rate_id`/`categories.vat_rate_id` cohérents partout.
- **Ma modale grille cesse d'être un piège** (elle posera le taux **org**, plus « du mauvais établissement »).
- Reporting/compta inchangé.

_Liés : [[project_vat_establishment_creation]] (durcissement TVA à revoir), [[project_nf525_ecdsa_signature]]._
