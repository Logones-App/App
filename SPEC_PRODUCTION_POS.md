# Spec POS — Écran Production (fabrication de préparations en lot)

_Décision 2026-07-12 : la **production** (fabriquer un lot de préparation) est **déléguée entièrement
au POS** et **retirée du SaaS**. Comme elle **déplace du stock** (consomme des matières + produit une
préparation), elle doit vivre là où le stock est possédé (`current_stock` = POS, sur site). Ce
document décrit précisément ce que le SaaS faisait, pour que le POS le reconstruise nativement._

## Qu'est-ce que la production ?

Fabriquer à l'avance un **lot d'une préparation** (ex. patons, sauce, fond) à partir de sa **recette**.
Un événement de production :
1. **consomme** les matières/ingrédients (déplétion FIFO de leur stock),
2. **produit** une quantité de la préparation (alimente son stock),
3. le **coût du lot** = Σ(coût des consommations) ÷ quantité produite (CMP), calculé par le trigger.

C'est une **activité physique et sur site** (on fabrique en cuisine) → naturellement côté POS.

## Modèle de données (déjà en base, partagé)

- **Préparation** = un `products` qui est une **recette avec rendement** : `yield_quantity`,
  `yield_unit` (ex. « 1 recette = 24 patons »), `portion_unit`.
- **Recette / BOM** = `product_compositions` (`main_product_id` = préparation, `component_product_id`
  = ingrédient, `default_quantity`, `quantity_unit`, `composition_kind='recipe'`). **Peut être
  imbriquée** (une préparation peut contenir une autre préparation) → il faut **aplatir jusqu'aux
  feuilles** (matières réellement stockées).
- **Stock par produit** = `product_stocks` (`current_stock`, `unit`, `inventory_tracked`).
  ⚠️ Une feuille avec `inventory_tracked=false` = **stock infini** → **NE PAS décrémenter**.
- **Mouvements** = `stock_movements` (`movement_type='production'`, `reference_type='production'`,
  `reference_id` = id de l'événement, `recipe_product_id` = la préparation).

## Algorithme de fabrication (ce que le SaaS faisait — à reproduire côté POS)

Pour fabriquer `N` unités d'une préparation `P` (rendement `yield_quantity`) :

1. **Aplatir la recette** de `P` jusqu'aux **feuilles suivies** (`inventory_tracked=true`), en
   multipliant les quantités par le **facteur d'échelle** `N / yield_quantity`. (Une feuille non
   suivie est ignorée — infinie.)
2. **Consommations** — pour chaque feuille `L` avec quantité requise `q` :
   - mouvement `stock_movements` : `quantity = -q`, `quantity_before = stock(L)`,
     `quantity_after = stock(L) - q`, `movement_type='production'`, `reference_id = eventId`.
   - `current_stock(L) -= q`.
   - ⚠️ **Insérer TOUTES les consommations AVANT la sortie** (le trigger somme les conso du même
     `reference_id` pour valoriser).
3. **Sortie** — un dernier mouvement pour `P` : `quantity = +N`, `quantity_after = stock(P) + N`,
   même `reference_id`.
4. **Coût** : le trigger `fn_fifo_valorize` gère déjà `movement_type='production'` → coût du lot
   produit = Σ conso ÷ N (CMP). **Rien à coder pour la valorisation.**

## Règle d'or (comme la réception)

Le stock est **possédé par le POS** : c'est **lui** qui écrit `current_stock` + les mouvements, sur
site, avec plafonnement/FIFO. Le SaaS n'y touche plus (production retirée du SaaS).

## Ce que l'écran POS doit offrir (UX minimale, reprise du SaaS)

- **Activer** le stock d'une préparation (créer sa fiche stock, unité = `yield_unit`) si absente.
- **Choisir** une préparation (recette avec rendement) + **saisir la quantité produite**.
- **Afficher les matières consommées** (recette aplatie, quantités mises à l'échelle) + **alerter si
  stock insuffisant** (`current_stock < besoin`).
- **Fabriquer** → crée l'événement (consommations + sortie, liés par `reference_id`), FIFO valorisé.
- **Historique des lots** fabriqués (date, quantité, coût unitaire, `needs_review`).

## Points d'attention (bugs évités côté SaaS)

- **Ordre d'insertion** : conso avant sortie (sinon le trigger ne somme pas correctement).
- **Feuilles non suivies** : ne pas décrémenter (`inventory_tracked=false`).
- **Recette imbriquée** : aplatir jusqu'aux feuilles, pas seulement le 1er niveau.
- **Plafonnement** : à vous de décider si une conso qui passerait sous zéro est plafonnée (cohérent
  avec votre garde de vente) et flaggée `needs_review`.

## Côté SaaS (fait)

Composant `product-dashboard-recipe-production-card.tsx` + carte « Fabrication en lot » **retirés**.
Le SaaS conserve le **coût de recette** (calcul théorique, lecture seule) mais **ne fabrique plus**.
Les colonnes/mouvements `production` restent lisibles par le SaaS (reporting), écrits par le POS.
