# Propriété de `current_stock` — coordination POS ↔ SaaS

_Point d'architecture ouvert, à trancher avec l'équipe POS. Fait suite au chantier
« contrôles stock/réception/conversion » (voir `AUDIT_STOCK_RECEPTION_CONTROLES.md`,
`SQL_FN_CONVERT_VALIDATION.md`) et à l'échange sur les snapshots de prix._

## Le constat

`product_stocks.current_stock` est **écrit en absolu par les deux clients** :

- **POS** : offline-first, `product_stocks` a `sourceOfTruth = LOCAL` → sur conflit de sync, la
  valeur **locale POS gagne**. `stock_movements` est **push-only** (`LOCAL_TO_REMOTE`, jamais
  re-pull) ; un mouvement déjà synchronisé n'est jamais ré-émis. Le POS **ne pull pas**
  `stock_movements`.
- **SaaS** : les **trois** opérations de réception écrivent `current_stock` directement
  (`src/lib/queries/reception-queries.ts`) :
  - création : `current_stock += orderQty × conversion_factor`
  - édition : `current_stock += (nouvelle − ancienne quantité)`
  - suppression : `current_stock −= quantité`

## Le conflit (diagnostic affiné, confirmé POS 2026-07-12)

Le POS a un merge custom `productStocks_merge` qui, sur conflit de `current_stock`, pose un flag
`_conflict` — **mais ce flag est mort** : strippé au push, lu nulle part. En pratique c'est donc du
**last-writer-wins sur une valeur ABSOLUE** :

- **au pull** : le serveur écrase le delta local POS non encore poussé ;
- **au push** : le POS écrase l'écriture SaaS.

> Des **deltas se perdent dans les deux sens** — y compris une **réception SaaS légitime** (`+550 g`),
> pas seulement une suppression. `v_stock_reconciliation` finit par signaler le drift.

**Racine du problème** : `current_stock` est **absolu**, calculé indépendamment par deux écrivains
depuis leur propre base. **Aucune règle « qui gagne » ne répare ça** — il faut des **DELTAS
appliqués à un seul propriétaire.**

⚠️ Ce n'est **pas** propre à la fonctionnalité « supprimer aussi le prix » ni au delete : c'est
structurel à **tout write absolu de `current_stock`** dès qu'un POS est actif sur le même
produit/établissement.

## Ce qui est DÉJÀ réglé

- **`supplier_references.unit_price`** (prix catalogue) : bidirectionnel + `KEEP_REMOTE` → le
  recalage décidé côté SaaS (via `repriceReferenceFromLatestSnapshot`) **parvient bien au POS**.
- **Snapshots de prix** (`supplier_price_snapshots`) : POS ne lit jamais la table (hors config de
  sync), ne l'écrit que via notre trigger (réception) ou en direct pour ses snapshots HACCP
  non-rapprochés (`supplier_reference_id` NULL). Notre hard delete ciblé
  (`supplier_reference_id` + `effective_from == created_at`) ne touche pas les snapshots HACCP.
  → Hard delete **transparent et validé des deux côtés.**

## Proposition consolidée (reco POS, mix pistes 1 + 3, 2 en repli)

**Propriétaire unique de `current_stock` = le POS**, pour tout produit qu'il gère (stock-suivi
**et** vendu en caisse) dans un établissement à POS actif — seul lui connaît les ventes offline.

- Le SaaS **n'écrit PAS `current_stock` en absolu** sur ces produits. Ses mutations (réception
  créée / éditée / supprimée) arrivent comme des **DELTAS que le POS ingère**.
- **Canal déjà existant** : le pont **`doc_imports`**. L'écran Stock du POS consomme
  `doc_import_lines` et écrit le mouvement + `current_stock` **en local**. Donc :
  - réception SaaS → **`doc_import_line`** ;
  - édition / suppression → une **ligne d'ajustement** que le POS applique.
- Produits / établissements **SANS POS actif** → SaaS-only, écriture directe OK (**piste 2**).

### Rappel des pistes brutes
1. **Propriété exclusive** par produit/établissement (POS owner ; SaaS envoie des deltas).
2. **Réceptions SaaS = stock SaaS-only** (produits sans POS actif) — quasi rien à coder.
3. **Réconciliation explicite** (deltas/ajustements ingérés par le propriétaire).

## Décision A/C — mode d'application (2026-07-12)

**Retenu : A — validation humaine sur le POS** (le POS met la réception SaaS en file « à traiter »,
un humain l'applique sur la caisse). C (auto-apply de fond, sans humain) reste une **évolution
future** possible **sans rework SaaS** (le SaaS émet le même doc_import dans les deux cas ; A/C =
politique POS, réglable par établissement).

⚠️ **Point opérationnel ouvert (à résoudre avec le POS, non bloquant pour le dev SaaS)** : pour un
établissement où **personne au restaurant ne valide** (tout saisi au bureau, caisse en vente seule),
A laisse les réceptions **en attente indéfiniment**. Il faudra décider **où** se fait la validation
pour ces cas (validation à distance sur le POS ? bascule ciblée en C ?). N'impacte pas la Phase 1
SaaS (identique), mais conditionne l'usage réel avant d'activer le mode `'pos'` sur ces établissements.

## Règle d'or (formulation POS, adoptée)

> Le SaaS **AJOUTE** et **RETIRE** (des deltas : `+10` à la réception, `−2` en ajustement).
> Le SaaS ne **FIXE JAMAIS** une valeur absolue (« le stock vaut désormais X ») sur un produit
> dont la caisse tient le compteur. Le POS est seul propriétaire du compteur pour ces produits.

Déclinaison :
- Réception `+10` → ✅ delta
- Correction / perte `±N` → ✅ delta d'ajustement
- 1ʳᵉ réception sur stock inexistant → ✅ delta `+10` à partir de 0 (exprimer en `+10`, pas `= 10`)
- « stock = X » absolu → ❌ interdit sur produit POS
- Inventaire physique (« compté 10 ») → ⚠️ à traduire en delta calculé par le **propriétaire** :
  comptage sur le POS, ou envoyer « cible = 10 » et le POS calcule l'écart contre SA base au moment
  d'appliquer. Jamais un `10 − (base SaaS peut-être périmée)` calculé côté SaaS.

## ⚠️ État réel du code SaaS — DEUX chemins auto-appliquent `current_stock`

L'hypothèse POS « rien de neuf pour la création, l'OCR produit déjà des doc_imports qu'on ingère »
**n'est pas exacte aujourd'hui**. Côté SaaS, **deux** chemins écrivent `current_stock` en absolu (le
SaaS **applique** le stock, il ne se contente pas d'émettre une ligne) :

1. **Modale « Nouvelle réception »** — `useCreateReception` (`reception-queries.ts`) :
   `UPDATE current_stock = current + delta` en direct.
2. **Validation d'une ligne de doc-import** — `doc-import-lines-queries.ts`, quand `applyStock=true`:
   - `UPDATE current_stock = quantityAfter` (ligne ~246) → applique le `+delta` **en plus** du POS
     qui ingère la même `doc_import_line` ⇒ **double application** (ou clobber) sur produit POS ;
   - **rescale d'unité** (ligne ~194-197) : `UPDATE current_stock = convertedQty` → **fixe le stock
     entier en absolu** = exactement le « = X » interdit par la règle d'or.

### Levier existant : le flag `applyStock`
Pour un produit à POS actif, il suffit que le SaaS passe `applyStock=false` : enregistrer la
`doc_import_line` + le snapshot de prix **sans** écrire `current_stock` ni le mouvement → la ligne
**devient le delta** que le POS applique (propriétaire unique). Le rescale d'unité ne doit **jamais**
tourner côté SaaS sur ces produits.

### Contrat d'ingestion POS (confirmé 2026-07-12) — 2 PIÈGES

**Prédicat d'application (par ligne)** : le POS applique une ligne quand
`apply_stock IS NOT FALSE AND applied_at IS NULL`, sous un `doc_imports` scopé `establishment_id`.
Il **ne lit jamais `automation_status`**. Matching via `supplier_reference_id` (fort) ou guess
`reference`/`designation` ; sans match → appariement manuel sur le POS.

- ⚠️ **PIÈGE 1 — `apply_stock`** : le POS le **lit**. `apply_stock=false` → il **saute** la ligne
  ⇒ « stock gelé, PERSONNE n'applique », **PAS** « le SaaS n'applique pas ». **Ne JAMAIS** poser
  `apply_stock=false` pour dire « SaaS s'abstient ». Une ligne à appliquer reste
  **`apply_stock=true` + `applied_at=NULL`**. La décision « SaaS applique ou non » est **interne
  SaaS** (sur `stock_owner`), pas portée par `apply_stock`.
- ⚠️ **PIÈGE 2 — `applied_at`** = **jeton d'idempotence STOCK** : seul celui qui applique le STOCK
  le pose. En `'pos'`, c'est le POS. **Si le SaaS applique le PRIX (snapshot) sans le stock, il ne
  doit PAS poser `applied_at`** (sinon le POS filtre `!applied_at` et saute le stock). Laisser
  `applied_at=NULL` ; `apply_price`/`automation_status` = suivi prix SaaS (POS les ignore).

**Réceptions manuelles → doc_imports SYNTHÉTIQUES** : le POS les ingère (pas de filtre
source/doc_type). Requis : `doc_imports` parent avec `establishment_id` ; lignes avec
`apply_stock≠false` + `applied_at=NULL`. Champs lus : `quantite`, `unite`, `prix_unitaire`,
`contenance_unitaire`, `unite_contenance`, `reference`, `designation`, `product_id`,
`supplier_reference_id` (renseigner `supplier_reference_id` idéalement → pilote conversion_factor +
fiche stock). ⚠️ **La réception synthétique apparaît sur le POS comme un « doc à traiter » qu'un
humain valide** (comme l'OCR) — **pas d'auto-apply** (auto-apply sans humain = dev POS « ingester
de fond » en plus).

**Ajustements signés (edit/suppression, ±N)** : **PAS supportés aujourd'hui** (le POS code en dur
`movement_type='purchase'` et saute `qty ≤ 0`). Ajustement propre = `movement_type='adjustment'` +
qty signée + **pas de snapshot prix** → **petit dev POS**, à caler sur le **marqueur** qu'on choisit
(proposition : colonne partagée `doc_import_lines.movement_type` nullable `purchase|adjustment`).

### 🧱 Briques DB pour l'inventaire PAR RÉFÉRENCE — côté POS (2026-07-12)

Réintroduites **après** la décision « SaaS = achat seul » : ce sont **2 objets DB partagés** au service
de l'**inventaire par référence natif du POS**. **Aucun impact code SaaS** (on n'émet pas ces mouvements)
— consignés ici pour trace. Fournis en SQL, déployés + testés par le POS.

1. **RPC `stock_by_reference(p_product_stock_id uuid)`** : somme des `remaining_quantity` par
   `supplier_reference_id` (lots vivants, `movement_type in ('purchase','production','adjustment')`),
   `label` via suppliers/supplier_references, `COALESCE(..., 'Sans référence')`. `STABLE` (pas SECURITY
   DEFINER → RLS de l'appelant). Sert au POS à afficher + plafonner l'inventaire par réf.
2. **`fn_fifo_valorize` — garde de scope réf** : **une seule ligne** ajoutée dans le `SELECT ... FOR UPDATE`
   de la **boucle de déplétion** (pas ailleurs) :
   `AND (NEW.supplier_reference_id IS NULL OR supplier_reference_id = NEW.supplier_reference_id)`.
   NULL = niveau ingrédient (comportement inchangé) ; réf posée = déplétion **limitée à cette référence**.

**Invariant de sécurité (garanti par le POS dans le code, pas par convention)** : seul l'inventaire-par-réf
natif pose un `supplier_reference_id` sur un mouvement **négatif/déplétant**. Ventes, pertes/inventaire
ingrédient, consommations production, et l'ancien `applyEntryLine` (fermé) = `supplier_reference_id NULL`.
Sinon une vente portant une réf verrait sa déplétion FIFO faussement limitée à cette réf. Le POS a balayé
et confirmé l'invariant → feu vert. SQL complet remis (`CREATE OR REPLACE` préserve owner/GRANTs).

### ✅✅ DÉCISION FINALE (2026-07-12) — SaaS = ACHAT SEUL, aucun ajustement de stock

Le POS tranche définitivement (supersede tout ce qui suit) : **toute modification de stock
(inventaire, pertes/casse, corrections, annulations post-validation) se fait CÔTÉ POS, nativement.
Le SaaS ne fait que la RÉCEPTION (achat). Le SaaS n'émet AUCUN ajustement de stock — zéro.**

**Répartition finale :**
- **SaaS** : réception (`'purchase'` via `doc_import`, **fait/validé**) ; **annulation/édition d'une
  réception UNIQUEMENT tant qu'elle n'est pas validée** (`applied_at IS NULL` = éditer/supprimer sa
  propre ligne en attente, **aucun stock n'a bougé**) ; prix, snapshots, reporting. **Après validation
  caisse → plus de retour arrière SaaS** (ça devient une correction POS).
- **POS** : validation des réceptions ; inventaire, pertes/casse, corrections, **annulations
  post-validation** → natif, sur site. Le SaaS n'émet rien.

**Abandonnés** : modale d'ajustement SaaS (entièrement) ; scope « par référence » ; 2 ajouts trigger
FIFO ; **toute émission de lignes `'adjustment'` via `doc_import`** (le SaaS n'en émet plus).

**Pas perdu** : le travail `fn_fifo_valorize` (adjustment/waste) **reste utile** — le POS écrit ces
mouvements (inventaire/perte) qui remontent au sync et que le trigger valorise. Ils viennent de la
caisse, pas d'un `doc_import`. La colonne `doc_import_lines.movement_type` devient **inutilisée**
(inoffensive, à garder).

**Impact code SaaS (à faire) :**
1. **Supprimer `emitAdjustmentDelta`** + les branches `'pos'` d'ajustement de `useDeleteReception` /
   `useUpdateReception` (le SaaS n'émet plus d'`adjustment`).
2. **Réceptions APPLIQUÉES → lecture seule en `'pos'`** (pas d'edit/delete ; corrections sur la caisse).
   Les réceptions **EN ATTENTE** (`applied_at NULL`) gardent édition/annulation (`pending-reception-queries`).
3. **Gater `useAddStockMovement`** (« Variations de stock ») en `'pos'` : **désactivé** (→ POS).
4. **Gater `useChangeStockUnit`** en `'pos'` : **bloqué** (aussi gardé par `fn_lock_stock_unit`).

> ⚠️ Tout ce qui suit (sections « inventaire côté POS mais correction réception SaaS », « a/b/c »,
> exemples scope référence) est **caduc** — conservé pour historique.

### 🔁 MISE À JOUR CONTRAT — Ajustements de stock (2026-07-12, réponse POS a/b/c)

Ajout d'une **modale d'ajustement** (onglet Stock, distincte de la réception). 3 points actés :

- **a) CLAMP par le POS, jamais par le SaaS** : pas de stock négatif. Le SaaS envoie la quantité
  **DEMANDÉE brute** (ex. `-7`, `-9`) ; **le POS plafonne** contre SON `current_stock` à la validation
  (base autoritaire — le SaaS ne pré-calcule PAS le plafond, base potentiellement périmée). Mouvement
  plafonné → `needs_review=true` (clamp visible, pas silencieux). **⚠️ change le contrat : `adjustment`
  est désormais PLAFONNÉ** (avant « sans clamp »). `movement_type='adjustment'` gère `+` (lot au CMP) et
  `−` (déplétion FIFO plafonnée). Optionnel `'waste'` pour distinguer une perte pure en reporting.
- **b) SCOPE — ingrédient (livrable tout de suite) vs référence (plus tard)** :
  - **Ingrédient/produit** ✅ natif, zéro dev POS : ligne `product_id` + `supplier_reference_id=NULL` +
    marqueur `scope='product'`. Le POS plafonne au `current_stock` produit, écrit UN mouvement adjustment ;
    `fn_fifo_valorize` dépeuple **déjà en FIFO croisé toutes réfs par date** (ordonne par `created_at`,
    ne filtre pas la réf) = exactement les exemples 2 & 3.
  - **Référence** ⚠️ **PAS supporté en l'état** : le POS n'a pas le stock par-réf en local (seulement le
    total produit ; « 5 kg de Réf A » = Σ `remaining_quantity` des lots de A, non re-pull), et
    `fn_fifo_valorize` ne filtre pas par `supplier_reference_id`. → nécessite **2 ajouts serveur** :
    (i) déplétion filtrée par `supplier_reference_id`, (ii) plafond par-réf côté serveur. **Différé.**
- **c) UNITÉ = STOCK, PAS de `conversion_factor`** : un ajustement/perte se mesure en unité de stock (kg).
  Le SaaS envoie `quantite` **directement en unité de stock** ; le POS **n'applique pas** le facteur
  (contrairement à la réception = unité de commande × facteur). **⚠️ IMPACT CODE SaaS** : mon
  `emitAdjustmentDelta` (Phase 2 edit/delete réception) envoyait un delta en **unité de commande** →
  **à corriger en unité de STOCK** (et scope produit tant que le scope référence n'est pas livré).

Gating des 2 dernières écritures directes `current_stock` (variations + changement d'unité) = OK (règle
d'or). NB : le changement d'unité est aussi gardé en base par `fn_lock_stock_unit` (interdit tant qu'il
reste des lots FIFO) — à coordonner séparément.

### ✅ CONTRAT D'IMPLÉMENTATION A — CONFIRMÉ POS (2026-07-12)

Load-bearing = `supplier_reference_id`. Le POS applique tout ; le SaaS émet.

- **Réception (`purchase`)** : ligne `doc_import_line` avec `quantite` **en unité de commande**
  (brut, non multiplié) + `supplier_reference_id`. Le **POS** calcule
  `stockQty = quantite × supplier_reference.conversion_factor`. `contenance_unitaire` **n'est PLUS
  le facteur** dès que `supplier_reference_id` est présent (POS ne le lit pas) → pas de `×facteur²`.
- **Facteur = source UNIQUE** `supplier_references.conversion_factor` (cohérent avec
  `fn_flag_ref_factor`). Le SaaS **arrête** d'encoder le facteur dans `contenance_unitaire` et
  d'écraser `conversion_factor` depuis (à corriger dans le flux OCR existant).
- **Ajustement (`adjustment`, Phase 2)** : `doc_import_lines.movement_type='adjustment'`, `quantite`
  **signée en unité de commande** + `supplier_reference_id`, **pas de snapshot prix**.
- **Back-link** : à l'application, le POS crée un `stock_movements` avec
  `reference_type='doc_import'` + `reference_id = doc_import_line.id`, **et** pose `applied_at` sur
  la ligne. → le SaaS corrèle sur l'un ou l'autre pour retirer le badge « en attente ».
- **`doc_imports` parent synthétique** : aucun champ `status` lu (pas d'exigence). Requis :
  `establishment_id` + ≥1 ligne structurée (`apply_stock≠false`, `applied_at=NULL`). `doc_type` libre
  (affichage) → marqueur dédié « réception SaaS » ; mettre `supplier_id` pour un libellé propre.
  ⚠️ **Créer le `doc_imports` UNIQUEMENT quand finalisé** (pas de brouillon → sinon il apparaît de
  suite dans leur file « à traiter »).
- **Fiche stock** : le POS crée `product_stocks` via son `ensure_self_stock` à l'application. Le SaaS
  **ne crée PAS** `product_stocks`/`product_compositions` en `'pos'`.
- **`unite`** = unité de commande (celle de `quantite`) ; **`unite_contenance`** = conditionnement
  (non load-bearing quand la réf est présente ; à remplir pour l'affichage seulement).
- **`automation_status`** : ignoré par le POS partout (UI comprise) → valeur libre côté SaaS.
- **PRIX — décision (a) [reco]** : en `'pos'`, le SaaS **ne snapshot PAS**. Le mouvement `purchase`
  créé par le POS déclenche `fn_snapshot_purchase_price` (→ snapshot + `unit_price`) à la validation.
  Évite le double-snapshot, ne touche pas au trigger, **supprime la tâche « snapshot SaaS » de la
  Phase 1**. Contrepartie : prix/historique mis à jour à la validation, pas à la saisie bureau.
  (Option (b) = prix immédiat mais exige de neutraliser le trigger + désynchronise prix/stock.)

### Portée de dev réelle (si on route les produits POS en deltas)
- Neutraliser l'auto-application `current_stock` sur **les deux** chemins pour produits POS (pas
  seulement ajouter une « ligne d'ajustement » pour l'édition/suppression, comme le suppose le POS).
- Manuelle : soit désactiver la modale réception sur produits POS, soit lui faire émettre un delta.
- Édition / suppression : type « ligne d'ajustement » (delta signé) via le pont `doc_imports`.
- Interdire le rescale d'unité SaaS sur produits POS (l'unité/le compteur appartiennent au POS).

## ✅ DÉCISION FINALE (2026-07-12, validée POS + produit)

**`establishments.stock_owner = 'pos' | 'saas'`, défaut `'pos'`.** Le SaaS conditionne toutes ses
écritures de stock à ce flag. Choisi plutôt qu'une règle en dur pour garder la couture d'un futur
**module Stock autonome** (app mobile / client sans caisse) à coût nul aujourd'hui.

- `stock_owner = 'pos'` (**tout le parc actuel**) → le SaaS n'applique **jamais** `current_stock` :
  `applyStock=false`, deltas via `doc_imports`, pas de rescale d'unité, jamais d'absolu. Le POS est
  seul applicateur (comportement identique à la règle inconditionnelle qu'il proposait).
- `stock_owner = 'saas'` → application directe côté SaaS (code actuel), pour un établissement
  **sans caisse**.

### INVARIANT à tenir des deux côtés (sinon réouverture du bug double-writer)
> **`stock_owner='saas'` ⟺ aucune caisse dans l'établissement.**
> Pas d'état mixte : jamais une caisse **et** des écritures directes SaaS sur le même établissement.

### Répartition
- **POS** : rien à coder. Il pull la colonne mais n'a même pas besoin de la lire (parc = `'pos'` =
  son cadre ; un établissement `'saas'` n'a pas de caisse donc aucun POS n'y tourne).
- **SaaS** : brancher le flag + le mode deltas (voir « Portée de dev » ci-dessus), puis pinguer le
  POS pour valider un cycle **réception SaaS → ingestion POS** sans double-compte.
- **Déjà réglé** : `unit_price` (bidirectionnel + KEEP_REMOTE), hard delete snapshots.

## Fichiers concernés (SaaS)

- `src/lib/queries/reception-queries.ts` — `useCreateReception`, `useUpdateReception`,
  `useDeleteReception` (écritures `current_stock`).
- `v_stock_reconciliation` (base) — détecteur de drift, socle d'une éventuelle piste 3.
