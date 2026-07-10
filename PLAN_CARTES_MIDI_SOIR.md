# Plan — Cartes Midi / Soir (carte publique = menu)

## Décisions (validées 2026-07)
- **Une carte = un menu** (`menus`). Les cartes Midi/Soir sont déjà des menus (prix par `menus_products.price`, horaires par `menu_schedules`, `is_public`).
- **`public_menu_sections.menu_id`** (FK `menus`, **nullable**) :
  - non-null → section propre à une carte/menu ;
  - **NULL → section commune**, affichée sur **toutes** les cartes.
- **Bascule** : bouton manuel Midi/Soir sur la carte publique ; **auto selon l'heure** sur le QR (via `menu_schedules`), avec override manuel.

## Constat technique (existant)
- `menu_schedules` (menu_id, day_of_week, start_time, end_time, valid_from/until) = **config dashboard uniquement**, jamais lue par la carte publique ni le QR.
- ⚠️ **Bug** : la config d'horaires (`menu-schedules-list.tsx`) écrit `day_of_week` en texte (`"monday"`) dans une **colonne numérique** → à corriger avant de gater le QR sur l'heure (Phase 3).
- QR : dispo gaté uniquement par `device_sessions` (session serveur) ; « menu courant » = 1ᵉʳ item de la carte (`order-page.tsx`).
- Carte publique : `getPublicCarteSections` fetch **toutes** les sections de l'établissement, aucun filtre menu ; item → `menus_products` (menu + prix).

## SQL Phase 1 (à passer au SQL Editor)
```sql
alter table public.public_menu_sections
  add column if not exists menu_id uuid references public.menus(id) on delete set null;
create index if not exists public_menu_sections_menu_id_idx
  on public.public_menu_sections(menu_id);
```
Additif : sections existantes `menu_id=NULL` = communes (zéro perte). Puis régé types.

## Phases

### Phase 1 — Modèle + éditeur (carte = menu)
- SQL `menu_id` (ci-dessus) + régé types.
- Éditeur `public-menu-editor-shared.tsx` :
  - **Sélecteur de carte** en tête : liste des menus de l'établissement + entrée « Communes (toutes cartes) » (= `menu_id NULL`).
  - Sections affichées = celles du scope sélectionné (menu choisi, ou communes).
  - `useCreateSection` : nouveau param `menuId` → section top-level créée avec le `menu_id` courant ; sous-section hérite du `menu_id` du parent.
  - Picker produits filtré au menu de la carte sélectionnée (prix cohérents) ; pour « Communes », tous menus (label menu déjà affiché).
  - `PublicMenuSectionWithItems` porte `menu_id` (via `Tables`).
- Query menus : réutiliser `useEstablishmentMenus` (id, name, is_public).

### Phase 2 — Carte publique (bascule Midi/Soir)
- `getPublicEstablishmentBySlug`/fetch : récupérer les **menus publics** (`is_public=true`) de l'établissement = les cartes.
- `getPublicCarteSections` : filtrer par `menu_id` (menu sélectionné) **+ sections communes** (`menu_id IS NULL`).
- Page `menu-public-client.tsx` : bouton/onglets Midi/Soir (menus publics), défaut = 1ᵉʳ (ou selon heure ?). Réutilise le pattern du sélecteur de langue.

### Phase 3 — QR auto par horaire
- **Fix bug `day_of_week`** (texte→numérique) dans `menu-schedules-list.tsx` (+ éventuel backfill SQL des lignes existantes).
- Logique de sélection du menu courant selon `menu_schedules` (jour + plage horaire + fenêtre valid_from/until) côté `order-page.tsx` (ou une API) ; override manuel (bouton Midi/Soir).
- Repli si aucune plage active.

## Points ouverts / à trancher plus tard
- Menu par défaut de la carte publique quand plusieurs menus publics (1ᵉʳ par display_order ? selon heure aussi ?).
- Sections communes : l'item garde le prix de SON `menus_product` (un menu) — OK pour prix identiques midi/soir ; si prix différents sur une section commune, à clarifier.
- Fuseau horaire pour la logique d'heure du QR (heure serveur vs établissement).
