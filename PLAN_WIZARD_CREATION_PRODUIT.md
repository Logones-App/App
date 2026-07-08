# Plan — Wizard de création produit « bout en bout » (avec création d'ingrédient imbriquée)

## 0. Objectif & route principale

Remplacer la page `/new` (formulaire base + sélecteur de rôle) par un **parcours guidé** qui mène
un produit de la création à l'état **utilisable** (vendable avec un prix, ou matière stockée).

**Route la plus fréquente (à privilégier dans l'UX) :** _« Je crée un produit destiné à la vente »_
→ ensuite deux sous-chemins :

- **Achat direct (revente sèche)** : je saisis son **prix d'achat**, puis son **prix de vente**.
- **Recette (cuisiné)** : je lui **ajoute des ingrédients** ; si un ingrédient n'existe pas, je le
  **crée à la volée mais complet**, puis je saisis le **prix de vente**.

D'où l'exigence centrale : **intégrer la création d'un produit (ingrédient) DANS la création d'un produit**
(récursivité, via une sous-fenêtre).

---

## 1. Décisions d'architecture

### 1.1 Fusion « Propriété + Caractéristiques » → composant `ProductBase` (2 modes)

Aujourd'hui `ProductProprieteForm` = 2 cartes, 2 boutons d'enregistrement (Propriété / Caractéristiques).
On fusionne en **un seul composant `ProductBase`** paramétré par `mode` :

- `mode="create"` → **insère** le produit, renvoie l'`id` (page 1 du wizard).
- `mode="edit"` → **met à jour** (un seul « Enregistrer ») = onglet Propriété de la fiche.

Contenu : nom, TVA, disponible, imprimante + descriptif (SKU, allergènes, origine, labels, food cost cible)
+ le **sélecteur de rôle** (À vendre / Matière / Les deux) déjà en place dans `ProductNewWizard`.

### 1.2 Déplacement du « poids de la portion vendue »

`portion_weight` / `portion_unit` **sort de « Caractéristiques »** (bloc descriptif) : c'est une notion
de **vente/service** et de **coût par portion**, conditionnelle au fait d'être vendu.

- Produit **recette** → à côté du **rendement** (contexte Recette).
- Produit **vendu tel quel** → affiché seulement si pertinent (souvent la portion = l'article).

« Caractéristiques » ne garde que le descriptif (allergènes, labels, origine, SKU).

### 1.3 Création d'ingrédient imbriquée (le cœur)

Pendant l'étape « Recette », « Ajouter un ingrédient » propose : **choisir un existant** OU
**« Créer un ingrédient »**. Ce dernier ouvre un **sous-wizard ingrédient en modale/sheet** par-dessus le
parcours parent (le parent est mis en pause, son état préservé). À la fin, le sous-wizard **renvoie
l'ingrédient créé** (`product_id` + `product_stock_id`), qui est ajouté à la composition du parent.

C'est **le même chemin « Matière/ingrédient »** du wizard, ré-affiché comme sous-flux → récursivité par
réutilisation, pas de code dupliqué.

---

## 2. Modèle du wizard : « hub + branches » piloté par le rôle

**Principe clé :** la **page 1 (Base) crée le produit** (on a besoin d'un `id` pour attacher recette /
prix / stock). Les étapes suivantes **enrichissent** et **réutilisent les panneaux existants de la fiche**
(Recette, Prix & Menus, Achats, Stock). On **séquence** l'existant dans l'ordre logique du type.

### Étapes & branchement

| Rôle (page 1) | product_type initial | Étapes « suite » (boutons du bas, dans l'ordre) | État final |
|---|---|---|---|
| **À vendre — acheté prêt** | `["ingredient","sellable"]` | **Prix d'achat** (SKU + réception) → **Prix de vente** (menu) → *Terminer* | Revente sèche : stockée + vendue |
| **À vendre — cuisiné** | `["sellable"]` | **Recette** (BOM, avec création ingrédient imbriquée) → **Prix de vente** (menu) → *Terminer* | Recette (`recipe` auto) + prix |
| **Matière / ingrédient** | `["ingredient"]` | **Prix d'achat** (SKU) → **Réception** (init stock/unité) → *Terminer* | Matière stockée |
| **Les deux** | `["ingredient","sellable"]` | **Prix d'achat + réception** → **Prix de vente** (menu) → *Terminer* | Stockée + vendue |

Pour un vendable, le choix **acheté prêt vs cuisiné** est un **sous-choix** au clic
(« Construire la recette » / « C'est acheté prêt → prix d'achat »).

### La barre de boutons du bas (cœur de la demande)

À chaque étape, l'**ensemble de boutons = fonction(rôle, étape courante)** :

- **1–2 actions « suite »** contextuelles (colonne du tableau),
- **« Terminer / Aller à la fiche »** (toujours dispo — sortie vers la fiche complète),
- **« Créer un autre »** (repart à la Base vide).

Parcours **non linéaire figé** : hub (Base) → branche pertinente → terminer.

---

## 3. La création d'ingrédient imbriquée — détail

Déclencheur : étape Recette → « Créer un ingrédient ».

Sous-wizard ingrédient (modale), **complet** :

1. **Base ingrédient** (`ProductBase` mode create, rôle = Matière) → insert `["ingredient"]` → `id`.
2. **Prix d'achat** : fournisseur (choisir/créer) + `supplier_reference` (SKU via `computeReferenceUnits`).
3. **Stock** : `ensure_self_stock(product_id, establishment_id, unit)` (pose `product_stocks.unit` +
   `portion_unit`), puis **réception** optionnelle (mouvement `purchase`).
4. **Retour** : renvoie `{ product_id, product_stock_id, unit }` au parent → ajouté à la composition
   (avec quantité + unité de conso).

**« Complet » minimum (à trancher, cf. §7)** : base + **prix d'achat** (nécessaire au food cost) ;
la **réception** (stock réel) peut être **différée** (l'ingrédient reste utilisable en recette avec son
coût). Recommandation : imposer base + prix d'achat, réception optionnelle.

**Récursivité** : le sous-wizard peut théoriquement rappeler « créer un ingrédient » (ingrédient composé).
→ **Limiter à 1 niveau** en V1 (un ingrédient créé à la volée est une matière simple, pas une sous-recette),
pour éviter la complexité. Sous-recettes = à créer via le parcours normal.

---

## 4. Séquences de données (inserts) par chemin

- **À vendre — acheté prêt** :
  1. `products` insert `["ingredient","sellable"]` → id.
  2. `suppliers` (si nouveau) + `supplier_references` (SKU) → `ensure_self_stock` → `stock_movements` (purchase, optionnel).
  3. `menus_products` insert (prix par menu).
- **À vendre — cuisiné** :
  1. `products` insert `["sellable"]` → id.
  2. Pour chaque ingrédient : existant OU **sous-wizard** (→ §3). `product_compositions` insert
     (main=produit, component=ingrédient) → `recipe` auto sur le parent, `ingredient` sur le composant.
  3. `menus_products` insert.
- **Matière / ingrédient** (et sous-wizard imbriqué) :
  1. `products` insert `["ingredient"]` → id.
  2. `suppliers`/`supplier_references` → `ensure_self_stock` → `stock_movements` (purchase, optionnel).

Rappels contrats : `purchase` **exige** `supplier_reference_id` ; `unit_cost` = coût par unité de stock ;
snapshot prix + `unit_price` **gérés par trigger serveur** (ne rien écrire côté app).

---

## 5. Composants : réutiliser vs créer

**Réutiliser (déjà écrits) :**
- Champs Base : `product-new-step1-base` (`Step1FormFields`), pickers attributs (allergènes/labels/origine).
- **Prix & Menus** : panneau `prix-menus` de la fiche.
- **Recette / composition** : `composition-add-modal` + panneau Recette.
- **Prix d'achat / SKU** : `product-dashboard-supplier-price-card` + `ReferencePhraseFields` + `computeReferenceUnits`.
- **Réception** : `product-dashboard-reception-modal` + `ensureSelfStock`.

**Créer (le neuf) :**
- `ProductBase` (fusion Propriété+Caractéristiques, 2 modes) + relocalisation poids de portion.
- **Coquille wizard** (`ProductCreateWizard`) : progression, corps, barre d'actions.
- **Routeur d'étapes** (map rôle → étapes, logique des boutons du bas).
- **Intégration du sous-wizard ingrédient** (modale récursive + retour de l'ingrédient créé).
- **Sélecteur de sous-chemin** vendable (acheté prêt / cuisiné).

---

## 6. Jalons (ordre d'implémentation)

- **M1 — Fondation Base. ✅ FAIT (2026-07).**
  - M1a : onglet Propriété = **un seul enregistrement** (fusion des 2 mutations dans `ProductProprieteForm`).
  - M1b : **poids de portion déplacé** hors de Caractéristiques → carte `SoldPortionCard` (« Portion vendue »)
    dans l'onglet Recette, affichée pour `isForSale` (recette ou non). Ingrédient pur : garde son unité de
    stock en lecture seule dans Caractéristiques.
  - **Fusion réelle FAITE** : composant partagé `ProductBaseFields` (`product-base-fields.tsx`) réutilisé par
    la fiche (`ProductProprieteForm`, edit) ET le wizard (`ProductNewWizard`, create) — un seul enregistrement.
  - ⚠️ Le bloc « Unité de gestion du stock » (lecture seule, ingrédient pur) a été **retiré** de Propriété
    (l'info reste dispo dans les onglets Stock/Achats).
- **M2 — Wizard « base fusionnée + boutons d'action ». ✅ FAIT (2026-07). Refait selon la demande.**
  `/new` = page 1 = `ProductBaseFields` (le bloc fusionné). **Pas de sélecteur de rôle** (retiré). Les boutons
  du bas **décident quoi créer ensuite et déduisent le `product_type`** ; chacun crée le produit + route vers
  la fiche sur le bon onglet (deep-link `?tab=`) :
  - « Ajouter des ingrédients → » → `["sellable"]`, onglet **Recette** (création d'ingrédient à la volée = M3).
  - « Prix d'achat direct → » → `["ingredient","sellable"]`, onglet **Achats**.
  - « Juste le prix de vente → » → `["sellable"]`, onglet **Prix & Menus**.
  - « Créer une matière » → `["ingredient"]`, onglet **Achats**.
  - `product-establishment-dashboard-panels.tsx` : deep-link `?tab=` prioritaire sur le localStorage.
  - Supprimés (code mort) : `product-new-next-steps.tsx`, `product-new-step1-base.tsx`. Sélecteur de rôle retiré.
- **M3 — Création d'ingrédient imbriquée. ✅ DÉJÀ EXISTANT (découvert 2026-07).**
  `CompositionAddModal` (onglet Recette, bouton « Créer un ingrédient ») fait déjà la création complète à la
  volée : nom + fournisseur + prix d'achat + unité → `ensureSelfStock` + `supplier_reference` + snapshot +
  `product_compositions` + `ensureProductType(parent, "recipe")`. À côté : « Ajouter un ingrédient » existant
  (`InlineIngredientAddRow`). Aligné §7.1 (costable, réception non forcée — pas de mouvement créé ici).
- **M4 — Autres rôles + finitions. ✅ largement couvert.** Rôles gérés par `ProductCreateNextSteps` ;
  « Créer un autre » présent ; bouton unique de création fait. **Nuance UX** : l'« achat direct » d'un
  vendable passe par le rôle **« Les deux »** (le rôle « À vendre » seul ne propose que Recette + Prix de
  vente) — le hint « revente sèche » du rôle « Les deux » l'oriente.
- **M5 — Bascule. ✅ déjà en place.** `/new` utilise déjà le wizard ; bouton unique posé ; `intent` conservé
  comme simple présélection de rôle (rétro-compat).

---

## 7. Décisions (tranchées 2026-07)

1. ✅ **Ingrédient à la volée = base + prix d'achat** (costable). **Réception différée** → plus tard sur
   la fiche (onglet Achats/Stock). Utilisable en recette avec son coût (dérivé de
   `supplier_references.unit_price`) même à stock 0.
2. **Poids de portion** → contexte **Recette/rendement** (reco appliquée ; à confirmer d'un mot).
3. ✅ **Abandon assumé** : le produit « nu » reste listé, **complétable ou archivable plus tard**
   (pas de nettoyage auto).
4. ✅ **Un seul enregistrement** pour la Base (create ET edit).
5. ✅ **Récursivité 1 niveau** : un ingrédient à la volée est une **matière simple** (pas de sous-recette).

---

## 8. Risques & garde-fous

- **`id` avant enrichissement** : rien n'est attachable tant que la Base n'est pas enregistrée → « Créer »
  = point de bascule clair.
- **ESLint** (complexity ≤ 20, max-lines ≤ 500) : découper coquille / routeur / chaque étape en fichiers
  séparés ; la logique des boutons dans un helper pur (testable).
- **Réutilisation des panneaux fiche en mode wizard** : ils opèrent sur un `product_id` → OK puisque la
  Base l'a créé ; vérifier qu'ils tolèrent un produit « minimal » (peu de données).
- **État du parent pendant le sous-wizard** : préserver le brouillon de composition ; le sous-wizard est
  une modale isolée qui ne renvoie que l'ingrédient créé.
- **Cohérence POS** : purement UI SaaS (mêmes inserts qu'aujourd'hui) → rien à coordonner côté mobile.
- **Coût sans réception** (décision §7.1) : vérifier en M3 que le calcul de coût recette utilise le prix
  fournisseur (`supplier_references.unit_price` normalisé → `unit_cost`) en l'absence de lot FIFO, sinon
  un ingrédient à stock 0 n'aurait pas de coût dans la recette.

---

## 9. Remarques / recommandations

- Le **poids de portion dans Caractéristiques n'est pas logique** (notion de vente/coût, conditionnelle) →
  déplacement acté dans le plan.
- Les deux anciens boutons (« Nouveau produit » / « Nouvel ingrédient ») étaient **déjà** un simple
  préréglage de `product_type` sur un formulaire identique → la fusion est cohérente, pas une régression.
- Le cas **revente sèche** (ingrédient **et** vendu) est la vraie raison de ne pas figer un type exclusif :
  le wizard le rend explicite via « acheté prêt ».
- Le parcours guidé **ne remplace pas** la fiche : « Terminer » y renvoie toujours pour l'édition fine.
