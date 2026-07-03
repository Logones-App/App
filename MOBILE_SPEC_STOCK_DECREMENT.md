# Spec MOBILE — Décrément de stock à la vente (recette-dans-recette + rendement)

> **Public** : équipe app mobile (POS offline-first).
> **Pourquoi ce doc** : le décrément de stock à la vente est écrit **par le mobile**, pas
> par le SaaS. Le SaaS vient d'ajouter deux capacités (déclinaisons, recettes imbriquées +
> rendement) qui changent **ce qu'il faut décrémenter** à la vente. Ce document décrit
> l'algorithme cible, avec exemples et cas limites.

---

## 1. Contexte : ce qui a changé côté SaaS

Deux évolutions du modèle produit :

1. **Déclinaisons** : un produit vendu (ex. « Verre de vin », « Canette de Coca ») est
   désormais une **recette** (`product_type` contient `"recipe"`, `stock_mode = "ingredients"`)
   qui **consomme une matière** via une ligne `product_compositions`. Il n'y a plus de type
   « achat direct ». Vendre le produit doit décrémenter la **matière** (ex. −33 cl de Coca),
   pas un stock du produit vendu lui-même.

2. **Recettes imbriquées + rendement** : une recette peut maintenant avoir **une autre
   recette comme ingrédient** (ex. une Pizza qui utilise une « Pâte » et une « Sauce
   tomate », elles-mêmes des recettes faites de matières). Ces sous-recettes
   (« préparations ») **n'ont pas de stock propre** : elles sont **transparentes**. Vendre
   la pizza doit descendre jusqu'aux **matières premières feuilles** (farine, tomate…) et
   les décrémenter.
   Pour répartir correctement, chaque recette-préparation porte un **rendement**
   (`products.yield_quantity` + `yield_unit`) = « cette recette produit X » (ex. 5 kg).

**Conséquence** : le décrément à la vente n'est plus « 1 niveau » (les composants directs).
Il faut **aplatir** l'arbre du BOM jusqu'aux feuilles, en appliquant une **proportion** à
chaque passage par une sous-recette.

---

## 2. Modèle de données (rappel des tables/colonnes utilisées)

### `products`
- `id`, `organization_id`
- `product_type` : `Json` (tableau de strings, ex. `["recipe"]`, `["ingredient"]`)
- `portion_unit` : unité de gestion/stock de la matière (ex. `"cl"`, `"g"`)
- `stock_mode` : `"none"` | `"product"` | `"ingredients"`
- **`yield_quantity`** (NOUVEAU) : `number | null` — quantité produite par le BOM tel que
  saisi (ex. `5` pour un lot de 5 kg). `null` = non défini.
- **`yield_unit`** (NOUVEAU) : `string | null` — unité du rendement (ex. `"kg"`). Défaut
  applicatif = `portion_unit`.

### `product_compositions` (le BOM — les arêtes de l'arbre)
- `main_product_id` : le produit parent (la recette)
- `component_product_id` : l'ingrédient/sous-recette consommé
- `composition_kind` : `"recipe"` (ligne de recette) | `"modifier"` (supplément caisse)
- `default_quantity` : `number` — quantité consommée par 1 unité du parent
- `quantity_unit` : `string | null` — unité de `default_quantity` (fallback =
  `component.portion_unit`)
- `conversion_factor` : `number | null` — multiplicateur éventuel (voir §4)
- `affects_stock` : `boolean` — la ligne décrémente-t-elle le stock ?
- `establishment_id`, `organization_id`, `deleted`
- **Self-composition** : la ligne où `main_product_id == component_product_id`. Elle porte
  le **stock propre** du produit (via `product_stocks`). À **exclure** du parcours BOM.

### `product_stocks`
- `product_composition_id` (→ pointe la self-composition du produit pour son stock propre)
- `current_stock`, `unit`, `inventory_tracked`, `establishment_id`, `deleted`

### `stock_movements` (déjà écrits par le mobile — on ne change PAS le schéma)
- `product_stock_id`, `establishment_id`, `organization_id`
- `movement_type` : `"purchase"` | `"sale"` | `"adjustment"` | `"restore"` …
- `quantity`, `unit`, `unit_cost`, `lot_allocations` (FIFO), `remaining_quantity`
- **`recipe_product_id`** : le produit VENDU (pour attribuer le COGS à la recette dans le
  reporting marge). ⚠ Reste le produit vendu **même pour les feuilles** décrémentées en
  profondeur (voir §7).

---

## 3. Vue d'ensemble de l'algorithme

À la finalisation d'une commande, pour **chaque ligne vendue** = (produit `P`, quantité `Q`) :

1. Si `P.stock_mode == "none"` → aucun décrément.
2. Si `P.stock_mode == "product"` → décrémenter le **stock propre** de `P` de `Q` (comportement
   actuel, 1 niveau, inchangé).
3. Si `P.stock_mode == "ingredients"` → **aplatir** le BOM de `P` jusqu'aux feuilles et
   décrémenter chaque feuille (voir §5–§6). **C'est la nouveauté.**

L'aplatissement produit une **map `{ feuilleProductId → quantité }`** (quantité exprimée
dans l'**unité de stock de la feuille**), une seule entrée par feuille (les contributions de
plusieurs branches sont **sommées**). On écrit ensuite **un mouvement `sale` par feuille**.

---

## 4. Quantité d'une arête

Pour une arête (ligne de composition recette) donnée, la quantité de composant consommée par
**1 unité du parent** est :

```
qtyArete = default_quantity × (conversion_factor ?? 1)      // dans l'unité `quantity_unit`
unitArete = quantity_unit ?? component.portion_unit
```

(C'est déjà la formule utilisée côté SaaS : `qtyPerSale = default_quantity × (conversion_factor ?? 1)`.)

---

## 5. Aplatissement (le cœur)

### Règle « feuille vs sous-recette »
Un composant est **une sous-recette à développer** s'il possède lui-même des arêtes recette
(un BOM) **et n'a pas de stock propre suivi** (par défaut les préparations n'ont pas de
stock). Sinon c'est une **feuille** (matière première) → on décrémente son stock propre.

> Option future « mode production » : si une préparation a un `product_stocks` propre
> `inventory_tracked = true`, la traiter comme **feuille** (on décrémente son stock au lieu
> de la développer). Par défaut, aucune préparation n'a de stock propre → on développe.

### Proportion via le rendement
Quand on développe une sous-recette `S` consommée en quantité `qtyArete` (unité `unitArete`) :

```
qtyEnUniteRendement = convert(qtyArete, unitArete, S.yield_unit)   // conversion d'unité
ratio = qtyEnUniteRendement / S.yield_quantity
```

On descend alors dans `S` en multipliant le facteur courant par `ratio`.

### Pseudocode

```
CAP = 4                     // profondeur max (garde-fou)
leaves = {}                 // Map<leafProductId, qtyEnUniteDeStockDeLaFeuille>

function flatten(productId, factor, depth, pathSet):
    if depth > CAP:
        log("cap profondeur dépassé", productId); return
    if productId in pathSet:
        log("cycle détecté", productId); return          // garde-cycle
    pathSet.add(productId)

    for arete in editesRecette(productId):                // kind=recipe, non-self, !deleted, affects_stock
        comp   = arete.component_product_id
        qty    = arete.default_quantity * (arete.conversion_factor ?? 1)
        unit   = arete.quantity_unit ?? portionUnit(comp)

        if estSousRecette(comp):                          // a un BOM recette ET pas de stock propre suivi
            Y   = yieldQuantity(comp)
            if Y == null or Y <= 0:
                // FALLBACK : pas de rendement → on suppose que le BOM = 1 unité de `unit`
                // → ratio = qty. Marquer needs_review sur les mouvements produits.
                ratio = qty ; flagNeedsReview = true
            else:
                qYU = convert(qty, unit, yieldUnit(comp))
                if qYU == null: log("unités incompatibles rendement", comp); continue
                ratio = qYU / Y
            flatten(comp, factor * ratio, depth + 1, pathSet)
        else:                                             // feuille (matière)
            su = uniteStockPropre(comp)                   // product_stocks.unit de la self-compo
            qStock = convert(qty, unit, su)
            if qStock == null: log("unités incompatibles feuille", comp); continue
            leaves[comp] = (leaves[comp] ?? 0) + factor * qStock

    pathSet.remove(productId)                             // autorise les « diamants » (même feuille via 2 branches)
```

Appel pour une vente : `flatten(P, Q, 0, {})` où `Q` = nombre d'unités vendues.
Le `pathSet` est ajouté à l'entrée et retiré à la sortie : cela **bloque les cycles**
(A→B→A) tout en **autorisant les diamants** (une feuille atteinte par deux chemins, qui doit
bien être sommée).

---

## 6. Écriture des mouvements

Pour chaque `(feuilleId, qtyStock)` de `leaves` :

1. Récupérer le `product_stocks` **propre** (self-composition) de la feuille pour cet
   établissement, `inventory_tracked = true`. Si absent ou non suivi → **ignorer** cette
   feuille (matière non suivie), éventuellement `log`.
2. Décrémenter `current_stock` de `qtyStock`.
3. Écrire **un `stock_movements`** de type `"sale"` **en réutilisant exactement la logique
   FIFO existante** que le mobile applique déjà pour un décrément de vente à 1 niveau :
   - `product_stock_id` = la fiche stock de la feuille,
   - `quantity` = `qtyStock` (convention de signe **identique** aux ventes actuelles),
   - `unit` = unité de stock de la feuille,
   - `lot_allocations` + `unit_cost` = **allocation FIFO** sur les lots de cette feuille
     (inchangé — c'est le même calcul qu'aujourd'hui, juste appliqué à ces feuilles-là),
   - `recipe_product_id` = **le produit vendu `P`** (pas la feuille — voir §7).

**Rien ne change dans le schéma des mouvements ni dans le calcul FIFO.** Ce qui change, c'est
uniquement **la liste des fiches à décrémenter et les quantités** (issues de l'aplatissement).

---

## 7. `recipe_product_id` et reporting

Le reporting marge (`margin-reporting-queries.ts` côté SaaS) agrège le COGS **par
`recipe_product_id`**. Pour que le coût matière d'une pizza soit correctement attribué à la
pizza, **tous** les mouvements de feuilles générés par la vente d'une pizza doivent porter
`recipe_product_id = id(pizza)`, même si la feuille (farine) a été atteinte via la sous-recette
« Pâte ». Ne PAS mettre l'id de la sous-recette.

---

## 8. Unités & conversions

- Réutiliser l'utilitaire de conversion existant (catégories **masse** g/kg, **volume**
  ml/cl/l, **pièce**). Une conversion entre catégories incompatibles (ex. `g` → `cl`) renvoie
  `null`.
- Deux conversions interviennent :
  1. **Développement d'une sous-recette** : `unitArete → yield_unit` de la sous-recette.
  2. **Feuille** : `unitArete → unité de stock de la feuille`.
- Si une conversion renvoie `null` → **ne pas décrémenter cette branche/feuille**, `log`
  (et idéalement `needs_review` sur le mouvement, ou une alerte), pour ne jamais écrire une
  quantité fausse.

---

## 9. Exemple chiffré complet

### Recettes
- **Pizza Margherita** (vendue, `stock_mode = "ingredients"`), BOM :
  - `1 × Pâte` (sous-recette)
  - `1 × Sauce tomate` (sous-recette)
  - `100 g Mozzarella` (matière)
  - `5 g Basilic` (matière)
- **Pâte** — `yield_quantity = 5`, `yield_unit = "kg"`, BOM *pour 5 kg* :
  - `3 kg Farine`, `1.8 l Eau`, `100 g Levure`, `60 g Sel`
- **Sauce tomate** — `yield_quantity = 2`, `yield_unit = "kg"`, BOM *pour 2 kg* :
  - `1.6 kg Tomate`, `0.2 l Huile d'olive`, `40 g Sel`

### Hypothèse d'usage
La pizza consomme « 1 × Pâte » : ici l'arête vaut `1` en unité `kg` (la portion de pâte pour
une pizza = 250 g → l'arête serait `0.25 kg`). Prenons **0,25 kg de Pâte** et **0,08 kg de
Sauce** pour une pizza.

### Calcul (vente de Q = 1 pizza)
- **Pâte** : ratio = `0.25 kg / 5 kg = 0.05`
  - Farine : `3 kg × 0.05` = **0,15 kg** = 150 g
  - Eau : `1.8 l × 0.05` = **0,09 l** = 90 ml
  - Levure : `100 g × 0.05` = **5 g**
  - Sel : `60 g × 0.05` = **3 g**
- **Sauce** : ratio = `0.08 kg / 2 kg = 0.04`
  - Tomate : `1.6 kg × 0.04` = **0,064 kg** = 64 g
  - Huile : `0.2 l × 0.04` = **0,008 l** = 8 ml
  - Sel : `40 g × 0.04` = **1,6 g**
- **Directs** : Mozzarella **100 g**, Basilic **5 g**

### Map aplatie finale (décréments écrits) — noter le **Sel sommé**
| Feuille | Quantité | Provenance |
|---|---|---|
| Farine | −150 g | Pâte |
| Eau | −90 ml | Pâte |
| Levure | −5 g | Pâte |
| **Sel** | **−4,6 g** | **3 g (Pâte) + 1,6 g (Sauce)** |
| Tomate | −64 g | Sauce |
| Huile d'olive | −8 ml | Sauce |
| Mozzarella | −100 g | direct |
| Basilic | −5 g | direct |

**Pâte** et **Sauce** : aucun mouvement. Chaque mouvement porte `recipe_product_id = pizza`.

---

## 10. Cas limites & garde-fous (checklist)

| Cas | Comportement attendu |
|---|---|
| `stock_mode = "none"` | Aucun décrément. |
| `stock_mode = "product"` | Décrément du stock propre de `P` de `Q` (1 niveau, inchangé). |
| Sous-recette **sans `yield_quantity`** | Fallback `ratio = qty` (BOM = 1 unité) + `needs_review`. Idéalement, empêcher côté SaaS d'utiliser une sous-recette sans rendement (à venir). |
| Unités **incompatibles** (arête vs rendement, ou arête vs stock feuille) | Ne pas décrémenter cette branche/feuille ; `log` + `needs_review`. |
| Feuille **sans stock suivi** (`inventory_tracked=false` ou pas de fiche) | Ignorer (matière non suivie), `log`. |
| **Cycle** (A→B→A) | Bloqué par `pathSet` (retiré à la sortie). `log`. |
| **Profondeur > CAP** (4) | Arrêt de la branche, `log`. En pratique 2-3 niveaux suffisent. |
| Même feuille via **deux branches** (diamant) | **Sommée** (une seule entrée dans `leaves`). |
| Lignes `composition_kind = "modifier"` | **Hors de cet algorithme** : gérées comme aujourd'hui (suppléments choisis à la caisse), pas dans l'aplatissement du BOM recette. |
| `affects_stock = false` sur une arête | La branche ne décrémente pas (ni la sous-recette ni ses feuilles via cette arête). |
| Self-composition (`main == component`) | **Exclue** du parcours (elle porte le stock propre, pas une ligne de BOM). |
| Annulation / remboursement d'une vente | Générer les mouvements **inverses** (`restore`) sur les **mêmes feuilles/quantités** issues du même aplatissement. |

---

## 11. Disponibilité (availability) — note complémentaire

La vérification de dispo devrait, à terme, elle aussi tenir compte des feuilles : un produit
`stock_mode = "ingredients"` est disponible tant que **chaque feuille** a
`current_stock ≥ qtyFeuilleParVente`. La dispo = `min sur les feuilles de (stock_feuille /
qtyFeuilleParVente)`. Aujourd'hui la vérif est à 1 niveau (stock propre du produit) — à
aligner côté mobile **et** côté route QR SaaS (`api/table-order/route.ts`, fonction
`checkStock`) si on veut bloquer les ruptures sur les recettes/déclinaisons.

---

## 12. Résumé pour l'implémenteur

1. Ne change **rien** au schéma des `stock_movements` ni au calcul **FIFO** existant.
2. Remplace la construction de la **liste des décréments** : au lieu des composants directs,
   utilise l'**aplatissement** (§5) → map `{ feuille → qté }`.
3. Applique la **proportion via `yield_quantity`** à chaque passage par une sous-recette.
4. Écris un mouvement `sale` par feuille, `recipe_product_id = produit vendu`.
5. Garde-fous : cap profondeur, garde-cycle, unités incompatibles, feuilles non suivies.
6. Miroir pour annulation (`restore`) et, en option, alignement de la vérif de dispo.
