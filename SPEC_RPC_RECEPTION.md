# Spec — RPC de réception fournisseur (`record_supplier_reception`)

_But : point d'entrée **unique** (POS + SaaS) pour enregistrer une réception. Le RPC ne **fait jamais confiance** aux valeurs dérivées : il ne reçoit que des **entrées brutes** et **recalcule** lui-même tout ce qui est risqué. Un formulaire buggé (POS ou SaaS) ne peut donc pas injecter un facteur/delta/coût faux._

## Principe : brut en entrée → dérivé/validé côté serveur → écriture atomique

Le client (POS ou SaaS) **n'envoie que** ce que l'humain a réellement saisi : **une liste de lignes**, chaque ligne = **« un prix pour une quantité pour une référence »**. Le conditionnement et les formats (« 10 sachets de 2×180 g », « 5 de 120 g ») sont résolus **côté formulaire** → une **ligne par référence** ; la base ne connaît que `(référence, quantité, prix)`. Le RPC lit le reste en base et calcule.

## Prérequis
- Une conversion d'unités **canonique côté SQL** : soit une fonction `fn_convert(p_qty numeric, p_from text, p_to text) returns numeric` (NULL/exception si non convertible), soit une table `unit_conversions`. **Miroir exact** de `src/lib/utils/unit-conversion.ts` (kg↔g, l↔ml↔cl…). C'est la seule source du facteur — **jamais** un facteur passé par le client.

## Signature

```sql
record_supplier_reception(
  p_establishment_id     uuid,
  p_lines                jsonb,       -- BRUT : [{ supplier_reference_id, order_qty, unit_price }, …]
  p_received_at          timestamptz default now(),
  p_notes                text default null,
  p_confirm_implausible  boolean default false   -- l'utilisateur a confirmé les lignes hors norme
) returns jsonb   -- tableau de résultats, une entrée par ligne (voir « Retour »)
```

**Une ligne = une référence = un conditionnement.** Réception de deux formats → deux lignes
(ex. `[{ref_sachet_2x180, 10, prix}, {ref_120, 5, prix}]`). Chaque ligne est brute : `order_qty` =
ce que l'humain a saisi (« 10 »), `unit_price` = prix par unité de commande de cette référence.
Les lignes peuvent viser des produits/stocks différents ; le RPC les résout indépendamment.

## Ce que le RPC NE reçoit JAMAIS (et ne peut donc pas être faux côté client)
- ❌ `conversion_factor` / `qty_per_pack`
- ❌ `stock_delta` / `quantity` en unité de stock
- ❌ `quantity_before` / `quantity_after`
- ❌ `unit_cost` (coût normalisé)
- ❌ l'unité du mouvement

Tout ça est **dérivé** en base. → un bug de formulaire ne peut pas les corrompre.

## Ce que le RPC dérive lui-même (server-side) — **pour chaque ligne**
| Valeur | Source |
|---|---|
| `product_id`, `order_unit`, `supplier_id` | `supplier_references` (via `line.supplier_reference_id`) |
| `product_stock_id`, `stock_unit` | `product_stocks` (via `ensure_self_stock` si besoin) |
| `factor` | `fn_convert(1, order_unit, stock_unit)` — **rejette si non convertible** |
| `stock_delta` | `line.order_qty × factor` |
| `quantity_before` | `SELECT current_stock … FOR UPDATE` — vrai solde verrouillé ; **chaîné** entre lignes visant le même stock (`before` de la ligne n = `after` de la ligne n-1) |
| `quantity_after` | `quantity_before + stock_delta` |
| `unit_cost` (par unité de stock) | `line.unit_price / factor` |
| `movement.unit` | `stock_unit` (imposé) |

## Ce que le RPC valide / rejette (par ligne)
- **Auth** : `auth_can_access_establishment(org, établissement)` (ou appartenance org) — sinon `RAISE`.
- `order_qty > 0`, `unit_price >= 0`, `p_lines` non vide.
- `order_unit` **convertible** vers `stock_unit` → sinon **rejet explicite** (« unité de commande kg incompatible avec l'unité de stock pièce »).
- **Plausibilité (non bloquante par défaut)** : si une `order_qty` est hors norme vs l'historique récent (ex. > 10× la médiane), et `p_confirm_implausible = false` → **aucune écriture**, retour avec un **warning** par ligne concernée (le formulaire redemande confirmation). Filet pour le « valide mais faux » (5,5 au lieu de 0,55).

## Ce que le RPC écrit — **une seule transaction pour toute la réception**
Pour **chaque ligne** :
1. `INSERT stock_movements` : `movement_type='purchase'`, `quantity=stock_delta`, `quantity_before/after` (chaînés), `unit=stock_unit`, `unit_cost`, `supplier_reference_id`, `product_stock_id`, `unit_price` (= `line.unit_price`, déjà par unité de commande), `created_by`.

Puis, une fois toutes les lignes traitées :
2. `UPDATE product_stocks.current_stock` = dernier `quantity_after` **de chaque stock affecté**.

**Atomicité** : tout dans **une seule transaction** — si une ligne échoue (unité incompatible, etc.), **toute la réception est annulée** (rien de partiel). Les triggers `fn_fifo_valorize` + `fn_snapshot_purchase_price` se déclenchent par insert.
⚠ **À réconcilier** : `fn_snapshot_purchase_price` recalcule `unit_price = unit_cost × conversion_factor` — redondant/incohérent avec un `unit_price` désormais fourni proprement. Le RPC devenant la source, soit il écrit `unit_price`/snapshot lui-même et on simplifie le trigger, soit on garde le trigger aligné sur le même `factor`.

## Retour — un tableau, une entrée par ligne
```
[ { line_index int,
    movement_id uuid,
    product_stock_id uuid,
    stock_before numeric, stock_after numeric, stock_unit text,   -- pour l'echo
    stock_delta numeric,
    unit_cost numeric,                                            -- par unité de stock
    warning text | null } ]      -- ex. "quantité inhabituelle, confirmez"
```

## Rôle du formulaire (POS **et** SaaS) — complémentaire, pas redondant
Le formulaire ne calcule plus rien de critique. Il :
- gère le **conditionnement/format** (« 10 sachets de 2×180 g ») et produit **une ligne `(référence, quantité, prix)` par référence** — c'est sa seule responsabilité de mise en forme ;
- ne demande, par ligne, **que** `order_qty` + `unit_price` (l'unité de commande vient de la référence) ;
- **pas de champ « facteur » libre** ;
- **affiche le résultat dérivé** renvoyé par le RPC (« → +550 g, coût 0,013 €/g ») pour que l'humain **valide** (attrape le typo) ;
- gère le **warning** de plausibilité (redemande + `p_confirm_implausible=true`).

## Rollout (ordre impératif — sinon on casse les écritures)
1. Créer `fn_convert` + `record_supplier_reception` (SECURITY DEFINER).
2. Migrer **SaaS** puis **POS** pour appeler le RPC au lieu des `INSERT/UPDATE` directs.
3. **Seulement après** : resserrer les GRANTs (retirer le DML direct sur `stock_movements`/`product_stocks` à `anon`/`authenticated`, ne laisser que l'`EXECUTE` du RPC) → **force** le passage par le contrôle.
4. Réparer l'existant via `v_stock_reconciliation` (lignes `has_drift`).

## ⚠ Contrainte offline-first (à valider avec le POS — point décisif)
Le POS écrit des mouvements **hors ligne** (surtout les **ventes**) puis sync. Un **RPC synchrone ne peut pas être appelé hors ligne.** Conséquence probable :
- **Réceptions** (acte délibéré, souvent online) → **RPC** `record_supplier_reception` : OK.
- **Écritures offline** (ventes, et réceptions saisies hors ligne) → le garde-fou naturel est un **trigger DB qui maintient `current_stock`** + validations (`CHECK`/trigger sur `stock_movements`), car il se déclenche **quand la ligne arrive en base** (online ou à la sync), là où un RPC ne peut pas.
- Cible réaliste = **RPC (réceptions online) + trigger `current_stock` (chemins offline)**, pas « RPC pour tout ». **À trancher avec le POS.**

## Questions au POS (faisabilité + avis objectif attendu)
1. **Offline-first (le plus important)** : quels mouvements le POS écrit-il hors ligne (réceptions ? ventes ?) ? Un RPC synchrone est-il envisageable pour la **réception** (online), et pour l'offline préfères-tu un **trigger `current_stock`** + validations ? Ton avis sur l'architecture cible.
2. **Chemin des ventes** : le décrément de vente (POS) touche `current_stock` — comment le sécuriser dans ce modèle (trigger ? file rejouée en RPC à la sync ?).
3. **RPC mobile** : le POS peut-il appeler `record_supplier_reception` (Supabase RPC) au lieu de ses INSERT/UPDATE directs pour les réceptions ?
4. **`fn_convert` canonique** : OK pour une conversion d'unités **unique côté SQL** (miroir du helper app) ? Qui la possède/maintient ?
5. **`conversion_factor`** : OK pour figer le sens (« unités de stock par unité de commande »), valider vs `order_unit`/`stock_unit`, et aligner le commentaire SQL (`schema:3978`) ?
6. **`fn_snapshot_purchase_price`** : OK pour réconcilier `unit_price` (le RPC/`unit_price` fourni devient la source) ?
7. **GRANTs resserrés** : impact sur vos écritures offline ? Séquençable sans casser la prod ?
8. **Multi-format / stock par format** : besoin métier côté POS (décrément d'un steak 180 g vs 120 g) ? Le stock **en poids (kg)** suffit-il, ou faut-il un stock **par format** ?

## Hors périmètre (à cadrer séparément)
- **Variations de stock** (pertes, ajustements, transferts) → un `record_stock_movement` jumeau, même principe (brut in, recompute).
- **Multi-format à la réception = DÉJÀ couvert** par le multi-lignes (une référence/ligne par format, chacune convertie en unité de stock via son poids net). Le RPC n'a **pas** besoin de connaître le format : le stock est un poids/quantité, tout fond dedans.
- **Ce qui reste (restructuration catalogue)** : le **comptage par format** (« combien de steaks de 180 g en stock ») — impossible avec un stock scalaire en kg quand les formats sont mélangés. Décision métier : suivre le stock **en poids** (kg, suffit ici) OU ouvrir un modèle **stock par format**. Sortir la portion de vente du `conversion_factor` reste la ligne directrice. Voir `project_catalog_restructure`.
