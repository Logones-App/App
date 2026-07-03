# Plan — Générateur de déclinaisons & unification (dépréciation « achat direct »)

> Objectif : un seul modèle mental **ingrédient (matière) → déclinaisons de recette**.
> On abandonne le type `purchased` (achat direct) comme type distinct. Comme le
> conditionnement porte déjà l'équivalence **1 canette = 33 cl**, « vendre 1 canette »
> et « décrémenter 33 cl » deviennent la même opération.

---

## 0. Les deux clarifications fondatrices

### 0.1 Le générateur crée-t-il les recettes depuis l'ingrédient ?
Oui. Sens = **fiche ingrédient → « Décliner en vente » → création de produits `recipe`**,
chacun relié à l'ingrédient par une ligne `product_compositions` (BOM).
C'est le miroir de `composition-add-modal.tsx` (qui va recette → ingrédient).

### 0.2 Faut-il un `portion_unit` multiple (`text[]` cl + canette) ?
**Non.** Une seule unité physique de stock (`cl`).
- `products.portion_unit` = `"cl"` (inchangé, string).
- « canette » = **équivalence de conditionnement** déjà stockée sur
  `supplier_references` : `packaging="Canette"`, `conversion_factor=33` (33 cl / canette).
- Déclinaison « à la canette » = produit `recipe` dont le BOM consomme **33 cl**
  (figé dans `product_compositions.default_quantity`).
- Afficher le stock « en canettes » = calcul dérivé `stock_cl / conversion_factor`.
  Aucun changement de schéma.

---

## 1. État des lieux du modèle (existant, rien à créer en DB)

| Donnée | Table / colonne | Rôle |
|---|---|---|
| Matière (ingrédient) | `products.product_type = ["ingredient"]`, `portion_unit` (string) | Stock + coût, **pas en vente** |
| BOM (une recette consomme X) | `product_compositions` (`main_product_id`, `component_product_id`, `composition_kind="recipe"`, `default_quantity`, `quantity_unit`) | Lien recette → ingrédient |
| Équivalence conditionnement | `supplier_references.packaging` + `conversion_factor` | 1 pièce = N unités de stock |
| Stock | `product_stocks` (+ `ensureSelfStock`) | Suivi en unité de gestion |
| **Prix de vente** | `menus_products.price` (+ `menus_products_price_history.sale_price`) | **Sur le lien produit↔menu, PAS sur le produit** |
| Coût recette | dérivé du BOM × `unit_cost` de l'ingrédient | Food cost auto |

Points de contact actuels de `purchased` (à traiter en dépréciation) :
- `src/lib/constants/product-attributes.ts` — enum `ProductTypeKey`, `PRODUCT_TYPES`, `PRODUCT_TYPE_BEHAVIORS`
- `product-establishment-dashboard-panels.tsx:44-46` — `isPurchased`, `isForSale = isRecipe || isPurchased`
- `product-dashboard-propriete-form.tsx:84-85` — garde-fou « en vente » (`recipe || purchased`)
- `csv-export.ts` — libellé exporté
- picker de types (`product-attribute-pickers.tsx`)

---

## 2. Le générateur — spécification fonctionnelle

**Emplacement** : fiche produit d'un **ingrédient** (`isIngredient`), une carte
« Décliner en vente » (bouton → modal `DeclinationGeneratorModal`).

**Contenu du modal :**
1. **Déclinaisons suggérées automatiquement** depuis les références fournisseurs de
   l'ingrédient : pour chaque référence avec conditionnement (`packaging` non nul),
   proposer « À la {packaging} » avec `quantité = conversion_factor` (cl), pré-cochée.
   - Ex. réf « Canette de 33 cl » → suggestion « À la canette » = 33 cl.
   - Ex. réf « Bouteille de 75 cl » → « À la bouteille » = 75 cl.
   - Dédoublonnage si plusieurs réfs partagent le même conditionnement.
2. **Portions personnalisées** : lignes ajoutables à la main (nom + quantité + unité
   = compatible avec `portion_unit`). Ex. « Au verre » = 12,5 cl.
3. Pour **chaque** déclinaison retenue, champs :
   - Nom (pré-rempli : `{nom ingrédient} — {libellé}`, éditable)
   - Catégorie (`category_id`, optionnelle, reprise de l'ingrédient sinon vide)
   - TVA (`vat_rate_id`, reprise de l'ingrédient ou défaut établissement)
   - **Prix de vente HT/TTC** (optionnel à ce stade)
   - **Menu cible** (optionnel) — si choisi + prix : rattachement immédiat au menu

**Aperçu par ligne** : « consomme 33 cl · coût matière ≈ X,XX € · marge ≈ … »
(coût = quantité × `unit_cost` ingrédient).

**Résultat** : les déclinaisons apparaissent comme produits vendables ; l'ingrédient
reste la matière (non vendue). Le stock est décrémenté en cl pour tous les formats.

---

## 3. Le générateur — implémentation technique

**Nouveau fichier** : `.../establishments/declination-generator-modal.tsx`
**Nouveau fichier (logique pure)** : `.../establishments/declination-generator-parts.ts`
(suggestions depuis références, validation, complexité ESLint ≤ 20 / ≤ 500 lignes).

**Mutation par déclinaison** (mutualisée, une transaction logique par ligne) :
1. `products.insert({ organization_id, name, category_id, vat_rate_id,
   product_type: ["recipe"], is_available: true, deleted: false })` → `recipeId`
2. `product_compositions.insert({ main_product_id: recipeId,
   component_product_id: ingredientId, composition_kind: "recipe",
   default_quantity: qty, quantity_unit: portionUnit, establishment_id,
   organization_id, is_required: false, deleted: false })`
3. **Si menu + prix fournis** :
   `menus_products.insert({ menus_id, products_id: recipeId, establishment_id,
   organization_id, price })`
   + `menus_products_price_history.insert({ menus_products_id, sale_price,
   effective_from: today, currency: "EUR" })`

**Invalidations** : `["organization-products", organizationId]` + clés menu concernées.

**Réutilisation** : le moteur `createIngredientProduct` / insert composition de
`composition-add-modal.tsx` sert de patron (extraire les helpers communs si utile).

---

## 4. Mode d'affichage « pièces ↔ cl » (dérivé, sans schéma)

- Le stock reste stocké en `cl`. Partout où on affiche un stock d'un ingrédient
  qui a une référence à conditionnement, proposer une bascule d'affichage
  **cl ↔ conditionnement** (`stock_cl / conversion_factor`).
- **Cas « revente scellée uniquement »** (toutes les déclinaisons = pleine
  contenance, aucune portion) : détecter automatiquement et
  - afficher/inventorier par défaut en **pièces**,
  - avertir (ou interdire) les stocks **fractionnaires** (16 cl d'une canette scellée
    n'a pas de sens).
  → C'est ce mode dérivé qui **remplace** fonctionnellement l'« achat direct » :
  aucun type à cocher, le système déduit le comportement.

> **Phase 2** : le mode pièces + garde-fou fractions est un raffinement ;
> la v1 peut livrer stock en cl + affichage dérivé simple.

---

## 5. Dépréciation de `purchased`

- **Ne pas** retirer la valeur de l'enum/DB tout de suite (compat mobile — repo séparé).
- Retirer `purchased` du **picker de types** (le proposer plus, ou le marquer
  « déprécié / legacy » et non sélectionnable pour un nouveau produit).
- Conserver `PRODUCT_TYPE_BEHAVIORS.purchased` et `isForSale = isRecipe || isPurchased`
  tant qu'il reste des produits `purchased` → les 4 legacy continuent de fonctionner.
- Documenter la dépréciation dans le code (commentaire) + mémoire.

---

## 6. Migration des 4 produits `purchased`

Deux options (au choix, non bloquant pour la v1) :

- **Option A — laisser vivre** : les 4 restent `purchased` et fonctionnent ; on ne
  crée simplement plus de nouveaux `purchased`. Retrait de la valeur reporté à plus tard.
- **Option B — convertir** (avec le générateur) :
  1. Créer la/les déclinaison(s) recette depuis chaque produit (matière).
  2. Les ajouter au(x) menu(s) avec le prix.
  3. Retirer l'ancien produit `purchased` du menu (⚠ garde-fou
     `propriete-form.tsx` : impossible de « sortir de la vente » un produit encore
     sur un menu/formule → l'ordre 2 avant 3 est obligatoire).
  4. Retyper l'ancien produit en `["ingredient"]`.

Quand 0 produit n'utilise plus `purchased` → retrait de la valeur (data triviale,
`product_type` est un `text[]` sans contrainte enum) + nettoyage des 5 points de contact.

---

## 7. À vérifier AVANT de coder

1. **Requête POS mobile** : confirmer qu'elle filtre sur « en vente » (présence en
   `menus_products` / flag) et **pas** en dur sur `product_type = "purchased"`.
   (Repo mobile séparé — non vérifiable ici ; à checker côté mobile.)
2. **Prix de vente** : confirmer que `menus_products.price` (+ history) est bien le
   seul point de tarification (aucun prix sur `products`). *→ confirmé dans les types.*
3. **Catégorie / TVA** obligatoires ou non à la création d'un produit vendable.
4. **Formules** : une déclinaison peut-elle entrer en formule (`formulas` / composants) ?

---

## 8. Découpage en lots livrables

| Lot | Contenu | Dépend de |
|---|---|---|
| **L1** | Générateur v1 : modal + suggestions depuis références + création recette + BOM (sans rattachement menu) | — |
| **L2** | Rattachement menu + prix (`menus_products` + history) dans le générateur | L1 |
| **L3** | Affichage dérivé cl ↔ conditionnement dans les vues stock | — |
| **L4** | Dépréciation `purchased` dans le picker + garde comportements legacy | — |
| **L5** | Mode « pièces » auto + garde-fou fractions (revente scellée) | L3 |
| **L6** | Migration des 4 produits + retrait final de la valeur `purchased` | L1, L4 |

Ordre recommandé : **L1 → L4 → L2 → L3 → (L5, L6 plus tard)**.

---

## 9. Phase « Typage dérivé » (le type émerge des actions, on ne le déclare plus)

> Idée validée (2026-07) : `product_type` **duplique** une information déjà portée par
> le graphe. On arrête de la saisir et on la **dérive**. Le type émerge de ce que fait
> l'utilisateur : on crée un produit nu, on lui **ajoute des ingrédients** → il devient
> une recette ; on l'**ajoute comme composant** d'une autre recette → il gagne
> visuellement les champs d'ingrédient (stock, coût).

### 9.1 Les 3 signaux orthogonaux (déjà en base)
| Signal | Source | Rôle dérivé |
|---|---|---|
| **A un BOM** | `product_compositions` où il est `main` (non-self) | Composé / produit → recette |
| **Est composant** | `product_compositions` où il est `component` chez un autre | Consommé → champs ingrédient (unité stock, coût) |
| **Est sur un menu** | `menus_products` | Vendu |

Combinaisons : BOM+menu = plat vendu · BOM+composant = préparation maison ·
(rien)+composant = matière première · BOM seul = préparation non rattachée.

### 9.2 Garde-fous
1. **Compat mobile** : NE PAS supprimer la colonne `product_type` (schéma partagé, le
   mobile la lit). La garder comme **miroir auto-maintenu** : les mutations « ajouter
   un BOM / devenir composant / rattacher à un menu » écrivent `product_type` en
   coulisse. L'utilisateur ne la touche plus.
2. **Recette-comme-composant** : lever `PRODUCT_TYPE_BEHAVIORS.recipe.canBeRecipeComponent = false`.
   La récursivité BOM existe déjà (`useEstablishmentRecipeEdges` + descendants dans
   la carte d'agrégation allergènes) → « recette dans recette » est déjà un concept
   vivant côté données, seul le type l'interdit aujourd'hui.

### 9.3 Découpage
| Lot | Contenu | Dépend de |
|---|---|---|
| **T1** | Dériver les rôles (has BOM / is component / on menu) pour l'affichage (onglets/champs) — remplacer `computeTabFlags` basé sur `product_type` | — |
| **T2** | Auto-maintenir `product_type` (miroir) sur mutations BOM / composant / menu | T1 |
| **T3** | Autoriser recette-comme-composant (lever la contrainte + surfacer les champs ingrédient quand un produit devient composant) | T1 |
| **T4** | Retirer le choix du type à la **création** (produit nu, rôles émergent) | T1, T2 |

### 9.4 Recette-dans-recette : décrément par APLATISSEMENT vers les feuilles (modèle retenu)

**Principe (validé 2026-07)** : une préparation (sous-recette) **n'a pas de stock stocké**.
À la vente d'un produit, on **aplatit** son BOM jusqu'aux **matières premières feuilles**
et on décrémente uniquement celles-ci ; les préparations sont **transparentes** (aucun
mouvement). Une même feuille présente dans plusieurs branches est **sommée**.

- **Coût / allergènes** : récursivité **illimitée** (lecture seule, déjà en place).
- **Stock** : aplatissement vers les feuilles, **cap 3-4 niveaux** + garde-cycle ; au-delà
  du cap → ignoré + `log`, jamais de plantage.
- **Pas de stock intermédiaire par défaut** (option future « suivre le stock de cette
  préparation » = mode production, off par défaut). Un stock dérivé « makeable » peut
  être **affiché** (lecture) mais jamais écrit.

**Prérequis — RENDEMENT (yield), lacune actuelle à combler** : `products` n'a
aujourd'hui que `portion_unit` / `portion_weight`, **aucune notion de lot/rendement**.
Pour convertir « 250 g de pâte » en grammes de farine, la recette-préparation doit porter :
- `yield_quantity` (+ unité, défaut = `portion_unit`) = « cette recette **produit X** »
  (ex. 5 kg). Le BOM est saisi *pour ce rendement*. **Champ à AJOUTER** (petite migration).
- La taille de lot devient un **choix** : saisir le BOM « pour 5 kg » ou « pour 1 kg ».
- Règle : `ratio = quantité_consommée_par_le_parent ÷ yield_quantity`, puis
  `décrément_feuille = quantité_feuille_dans_le_lot × ratio` (sommé par feuille).
- **Bonus** : le rendement rend aussi le **coût matière par portion** exact
  (coût du lot ÷ rendement).
- ⚠ **À vérifier avant de coder** : le sens actuel de `portion_weight`
  (`composition-add-modal.tsx` l'utilise = quantité d'achat de référence) pour éviter un
  conflit sémantique — sinon `yield_quantity` doit être un champ distinct.

Exemple : Pâte rendement 5 kg (Farine 3 kg, Eau 1,8 L, Levure 100 g, Sel 60 g). Pizza
consomme 1 portion = 250 g → ratio 5 % → −150 g farine, −90 ml eau, −5 g levure, −3 g sel
(+ sel de la sauce). Pâte : aucun mouvement.

### 9.5 Découpage stock/rendement
| Lot | Contenu | Dépend de |
|---|---|---|
| **S1** | ✅ FAIT — colonnes `products.yield_quantity`/`yield_unit` (SQL exécuté) + carte « Rendement de la recette » (`product-dashboard-recipe-yield-card.tsx`, montée dans la fiche technique pour `isRecipe`) | — |
| **S2** | ✅ FAIT (2026-07, SaaS) — recette-comme-composant : `PRODUCT_TYPE_BEHAVIORS.recipe.canBeRecipeComponent=true` ; sélecteur fiche technique = ingrédients + sous-recettes (avec rendement), garde-cycle (`computeAncestors`), unité = `yield_unit` de la sous-recette. | T3 |
| **S3** | ✅ FAIT (2026-07, SaaS **COÛT**) — coût récursif : `src/lib/recipe-cost.ts` (`recipeBatchCost`/`componentUnitCost`, garde-cycle) + `useEstablishmentRecipeCompositions`. Branché coût par ligne + `totalCostHT` + coût par portion (carte rendement). Sous-recette : coût = coût du lot ÷ rendement. ⚠ L'aplatissement **STOCK** (map feuilles pour le décrément) reste **mobile** (§S4). | S1, S2 |
| **S4** | ⚠ HORS REPO SaaS — voir note ci-dessous | S3 |
| **S5** | (Option) affichage dérivé « makeable » d'une préparation ; (option) mode production stock propre | S3 |

**Distinction « à-la-minute » vs « produit à l'avance » (tranchée 2026-07)** : gouvernée par
« la préparation a-t-elle son propre stock suivi ? ». Stock propre → **feuille** (bloque/
décrémente sur son propre stock, ex. patons ; matières hors-jeu à la vente). Pas de stock
propre → transparente → on descend au raw. **Q1 = blocage dur** sur les feuilles détectées ;
feuille non suivie = infinie ; dispo = min sur feuilles ; pas de toggle survente.

**CHANTIER SUIVANT identifié — Production / fabrication d'un lot** (pendant « entrée » du
décrément de vente) : `movement_type='production'` existe (mouvement positif manuel) mais
AUCUN flux automatisé. À construire : « fabriquer N unités d'une préparation » → aplatir son
BOM (via `yield_quantity`) pour **−matières** + **+stock de préparation** + coût du lot/unité.
Nécessaire pour couvrir pleinement le cas « produit à l'avance » (pâte 24h). SaaS + mobile.

**FINDING 2026-07 — le décrément de vente n'est PAS dans ce repo.** La route QR/web
(`api/table-order/route.ts`) ne fait que **vérifier** la dispo + créer une
`table_order_requests` (pending) ; aucune écriture `movement_type:"sale"` ici (seulement
`purchase`/`adjustment` en réception/doc), aucune fonction DB de décrément. Les mouvements
« sale » (avec `recipe_product_id` + `lot_allocations` FIFO) sont **écrits par l'app mobile
(offline-first)**. → **S4 = chantier MOBILE (ou fonction Postgres partagée)**, pas SaaS.
Spec à transmettre : à la finalisation d'une commande, aplatir le BOM du produit vendu vers
les feuilles (proportion via `yield_quantity`, cap 3-4 niveaux + garde-cycle, sommer les
feuilles), puis écrire un mouvement `sale` par feuille. La logique pure d'aplatissement (S3)
peut être écrite ici comme référence/lib et utilisée pour le **coût** (cost-per-portion,
coût d'une recette contenant une sous-recette), mais le **décrément** reste mobile.

**→ SPEC MOBILE COMPLÈTE RÉDIGÉE : `MOBILE_SPEC_STOCK_DECREMENT.md`** (contexte, modèle de
données, algorithme d'aplatissement + pseudocode, rendement, conversions, FIFO,
`recipe_product_id`, exemple chiffré pizza, 12 cas limites, note dispo). À transmettre à
l'équipe mobile.

---

## 10. Ce que ce plan NE fait PAS (hors périmètre)

- Pas de changement de schéma DB (tout est dérivable de l'existant).
- Pas de suppression immédiate de l'enum `purchased` (dépréciation progressive).
- Pas de suppression de la colonne `product_type` (miroir de compat mobile).
- Pas de refonte du wizard de création produit (chantier séparé déjà noté).
