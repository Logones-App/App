# État des lieux — passer les taux de TVA en scope ORGANISATION

_2026-07-13. Objectif : `vat_rate` est aujourd'hui scoppé par **établissement** (chaque établissement
duplique 5,5/10/20) alors que les **produits sont org-level** → un `products.vat_rate_id` pointe vers
le taux d'UN établissement, faux dans les autres. Cible : `vat_rate` scoppé par **organisation**._

## TL;DR (verdict)
- **Faisable, volumétrie faible, migration bien bornée** — MAIS **modèle partagé avec le POS** (bloquant
  de coordination) et **refonte des 2 flux « TVA à la création »**.
- **Le reporting/compta N'EST PAS impacté** (les ventes stockent la **valeur** de TVA, pas l'id).
- Effort : **~M-L, quelques jours**, dont la **coordination POS** est le vrai chemin critique.

---

## 1. DB / backfill (mesuré en base)

| Fait | Valeur |
|---|---|
| `vat_rate` a **déjà** `organization_id` | ✅ (nullable) → **aucune colonne à ajouter** |
| `establishment_id` | `NOT NULL` + FK + **RLS établissement-scoped** (`auth_can_access_establishment`) |
| FK entrantes vers `vat_rate` | **2** : `products.vat_rate_id` (**242**, PAS de ON DELETE SET NULL), `categories.vat_rate_id` (**11**, ON DELETE SET NULL) |
| `category_grid_items.vat_rate_id` | colonne existe mais **pas de FK** (à confirmer ; probablement legacy) |
| Ventes | `order_products.vat_rate` = **valeur numérique** (pas de FK) → **reporting inchangé** |
| Volumétrie | 12 lignes vat_rate → **7** après dédup par (org, valeur) ; **253** lignes à repointer |

### Backfill = ~7 requêtes SQL (faible risque, faible volume)
1. Remplir `organization_id` où null (depuis l'org de l'établissement).
2. Choisir **1 ligne canonique** par (org, valeur).
3. Repointer `products.vat_rate_id` (242) → canonique (match par valeur).
4. Repointer `categories.vat_rate_id` (11) → canonique.
5. (Vérifier/repointer `category_grid_items.vat_rate_id` si utilisé.)
6. Soft-delete les doublons vat_rate.
7. `alter … drop not null` sur `establishment_id` + **réécrire la RLS** en org-scoped.

---

## 2. Ce qui N'EST PAS impacté (allège fortement)
- **Reporting compta / ventes / marge** : lit `order_products.vat_rate` (valeur) — aucun `.from("vat_rate")`,
  aucune jointure FK. `accounting-export-queries`, `sales-reporting-queries`, `margin-reporting-queries`. ✅
- **Devis / documents** : utilisent une valeur `vat_rate` numérique, pas la table. ✅
- **Lectures par jointure FK** (survivent tant que la ligne/FK survit, valeur seule) :
  `product-establishment-dashboard.ts:257` (`vat_rate:vat_rate(value)`), `establishments-menu-queries.ts:260`
  (grille), `menu-utils.tsx:185` (carte publique). **Inchangées.**

---

## 3. Code à changer (quantifié)

### 3a. LE point central (1 hook)
- `src/lib/queries/establishments-related-queries.ts:187-204` — `useEstablishmentVatRates(establishmentId)` :
  `.eq("establishment_id", …)` → **`.eq("organization_id", …)`** + renommer `useOrganizationVatRates`.
  **Tout le reste des sélecteurs passe par ce hook.**

### 3b. Consommateurs du hook (~10 fichiers, changement de signature establishmentId → organizationId)
doc-line-create-modal · composition-add-modal · product-category-dialogs · product-new-wizard ·
product-dashboard-propriete-form · product-option-groups-config · product-option-group-dialogs ·
product-base-fields · menu-products-grid-panel (ma feature grille). → **mécanique**, ~10 call sites.

### 3c. Écriture des taux (1 seul site) + refonte du modèle de création
- `src/lib/server/establishment-provisioning.ts:148-158` — `insertVatRates` : aujourd'hui insère
  **par établissement**. → doit **seeder une fois par ORG** (idempotent : ne pas re-créer si l'org a déjà ses taux).
- **⚠️ 2 flux client « Taux TVA » à revoir** (le vrai travail non-mécanique) :
  - `create-establishment-modal.tsx` (FormVat, `DEFAULT_VAT`, `MANDATORY_VAT=[10,20]`, libellé « appliqués
    aux produits de cet établissement »).
  - `convert-lead-modal.tsx` / `convert-lead-steps.tsx` (`StepVat`, son propre `DEFAULT_VAT`/MANDATORY).
  → Si la TVA devient org-level : on ne la saisit **plus à la création d'établissement** mais **à la
    création d'ORG** (ou « ensure org has rates »). Ça **retouche le durcissement récent** [[project_vat_establishment_creation]].
- Où seeder à la création d'ORG : `createOrg` (route leads convert) + création d'org admin — **à identifier**
  (aujourd'hui le seed VAT est côté établissement, pas org).

### 3d. Écritures de `vat_rate_id` (restent valides, pointeront vers le taux ORG)
products/catégories : product-new-wizard, product-dashboard-propriete-form, composition-add-modal,
product-category-dialogs, product-dashboard-stock-panel (déclinaisons), declination-generator-modal,
create-ingredient-from-product-modal, use-insert-menu-grid-item (ma feature). → **inchangées en logique**
(elles posent un vat_rate_id ; il pointera vers un taux org). Ma **modale grille** cesse d'être un piège
(elle posera le taux **org**, plus « du mauvais établissement »).

---

## 4. Coordination POS (⚠️ chemin critique)
Le POS **lit `vat_rate`** (scoppé établissement aujourd'hui) et la **RLS** actuelle est établissement-scoped.
Passer en org-scoped + changer la RLS = **modèle partagé modifié** → **à valider et coordonner avec le POS
AVANT** (sinon POS cassé). C'est la vraie dépendance externe.

---

## 5. Effort + risques
| Lot | Taille |
|---|---|
| Backfill SQL (dédup + repoint 253 + RLS) | **S** (bien borné, faible volume) |
| Hook central + ~10 consommateurs | **M** (mécanique) |
| Refonte seed VAT (établissement→org) + 2 flux création | **M-L** (modèle + UX) |
| RLS org-scoped | **S** (mais sensible) |
| Coordination POS | **externe** (chemin critique) |
| Tests | **M** |

**Risques** : (1) coordination POS = dépendance bloquante ; (2) RLS à réécrire correctement ; (3) dédup +
repoint atomiques (253 lignes) ; (4) UX « TVA à la création » change (2 flux) — retouche le travail récent.

## 6. Recommandation
- **Pas avant l'audit du 15/07** (non bloquant : valeurs correctes, reporting sain).
- **Planifier post-audit, coordonné POS.** Le backfill est simple ; le gros du travail = le **modèle de
  seed** (org au lieu d'établissement) + les **2 flux création** + la **RLS** + le **feu vert POS**.
- **Stopgap possible entre-temps** (sans migration) : résoudre la TVA affichée/posée **par valeur dans
  l'établissement courant** — corrige le symptôme (bon établissement) sans toucher au modèle partagé.

_Liés : [[project_vat_establishment_creation]], [[project_nf525_ecdsa_signature]] (coordination POS)._
