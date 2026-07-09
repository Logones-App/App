# HACCP SaaS — plan de travail & cadrage POS

> État 2026-07. SaaS = **CONFIG only** (6 tables) ; journaux/registres + lecture « inspecteur » = plus tard. Toute évolution de schéma `haccp_*` = **coordination POS** (sync bidirectionnel, POS tient le SQL + le mobile).

## Fait ✅
- CRUD des 6 tables config (zones, sondes, surfaces, bains, checklists, documents) + auto-seed à la création d'établissement.
- **Cadence `frequency`** (enum 5 valeurs : biquotidien/quotidien/hebdomadaire/mensuel/ponctuel) branchée : sondes (défaut biquotidien), bains + checklists (défaut quotidien) ; `frequency_label` libre conservé sur checklists. Pilote le tableau de bord « Tâches du jour » mobile.
- **Fusion Zones + Surfaces** : page unique « Zones & surfaces » (chaque zone = carte + ses surfaces + « + Surface » pré-rempli ; section « Sans zone »). Ancienne route `surfaces-nettoyage` + entrée nav supprimées.
- **Documents** : correction du bouton d'ouverture (onglet ouvert avant l'await → plus de blocage popup, + toast d'erreur si la signature échoue).

## Groupe A — FAIT ✅ (ALTER appliqué par le POS + câblage SaaS 2026-07)
- `haccp_cleaning_surfaces` : `description`, `product`, `responsible` → **exposés** dans le modal Surface (page Zones & surfaces) + résumé produit·responsable sur la ligne. (`responsible` en text libre ; passera en `responsible_label` + id si un jour ça pointe un employé.)
- `haccp_oil_baths` : `capacity_l`, `oil_type`, `zone_id` (FK zones ON DELETE SET NULL) → **exposés** dans le modal bain (page Équipements, composant `OilBathFields`) + colonne « Détail » (capacité·huile) et colonne Zone désormais pour les 2 types. **PAS** de `last_change_at` (dérivé de `oil_tests.changed`).
- `haccp_oil_tests.organoleptic_ok` (booléen) : saisi **mobile** au test → **aucune UI SaaS** (registre). Rien à câbler.
- tsc + eslint verts. Refacto : `initialEquipState` + `ZoneSelect`/`OilBathFields` pour tenir la complexité ≤20.

## Groupe B — chantier FUTUR, hiérarchisé (POS 2026-07). Fil rouge : réutiliser suppliers/products/employees, éviter le sur-modèle.
🟢 **Prioritaires (vrais manques)** :
1. **Contrôles T° produit à cœur** — ✅ **CADRÉ + schéma validé (2026-07)**. Table `haccp_product_temp_controls` (registre événementiel LOCAL_TO_REMOTE, hors tableau de tâches, saisie **mobile**) : `control_type` (cuisson/remise_en_chauffe/maintien_chaud — les 3 suffisent), `product_label`, `measured_at`, `temperature_c`, `min_temp_c` (défaut **63°C**, éditable par ligne — pas de config établissement), `conform` (calc mobile), `corrective_action`, `note`, `production_lot_id` FK souple, `recorded_by`/label. Décisions : seuil 63 par ligne éditable (63 = plancher légal, volaille 74 en override) ; suggestion UX mobile = cibles conseillées par famille ; option future `held_min` (couple temps/T°). **En attente : POS applique l'ALTER + régénère les types. Lecture inspecteur SaaS = plus tard.**
2. **Allergènes** — ✅ **DÉJÀ COUVERT** (2026-07). `products.allergens` (Json) **existe** et est **édité** dans la fiche produit SaaS (`AllergenPicker` dans product-base-fields.tsx) ; `supplier_references.allergens` existe aussi. Le mobile lit `products.allergens`. **Rien à construire.** Seul écart avec le mock : pas de champ `traces` distinct (« peut contenir des traces ») → optionnel, **non retenu** pour l'instant (anti-sur-modèle ; `allergens` couvre la déclaration « contient »).
3. **Non-conformités (pivot PMS)** — ✅ **SCHÉMA VALIDÉ, version COMPLÈTE (2026-07). POS prépare le SQL.** Table `haccp_non_conformities` : category (enum), title, description, **lien source DOUBLE** (générique `source_type`+`source_id` + FK concrète `reception_id`), zone_id, **severity** (mineure/majeure/critique), **status** (ouvert/en_cours/cloture), detected_at, **corrective_action + preventive_action** (HACCP exige les deux), **assigned_to**/label + **due_at**, **closed_at/by**/label, **photo_path**, recorded_by/label, audit. Colonnes extra nullables → mobile écrit un sous-ensemble minimal (catégorie/description/source/reception_id/recorded_by), **SaaS gère le cycle de vie**. **Sync = BIDIRECTIONAL + realtime** (édité 2 côtés, « NC ouvertes » live). Aujourd'hui NC réception en JSONB (`haccp_receptions.delivery_nc[]`/`items[]`) → à la validation mobile d'une réception NC, écrire aussi une ligne pivot (reception_id).
   **SaaS FAIT ✅ (2026-07, table en base + types)** : `haccp-nc-queries.ts` (list, upsert, **clôture**, soft-delete, **realtime** `useHaccpNcRealtime`) + page `non-conformites` réécrite (ex-mock) : filtres statut (Actives/Ouvertes/En cours/Clôturées/Toutes), cartes avec badges catégorie·gravité·statut, modal complet (catégorie, gravité, titre, description, statut, zone, actions corrective+préventive, responsable, échéance, n° NC), bouton **Clôturer**, compteur « actives ». tsc + eslint verts. Reste (plus tard) : écriture auto d'une NC à la validation mobile d'une réception NC (`reception_id`) + compteur sur le dashboard.

🟡 **Réutiliser l'existant** :
4. **Fournisseurs** — **NE PAS** créer `haccp_suppliers`. Table **`suppliers` existe déjà** (partagée module Stock : suppliers + supplier_references + barcodes). Move : `supplier_id` FK → `suppliers` sur `haccp_receptions` (à côté du `supplier_label` texte gardé pour OCR/saisie libre) + enrichir `suppliers` (agrément CE, certifs, note qualité).
5. **Formations employés** — rattaché à **`employees`** (FK `employee_id`), côté HR/SaaS. Zéro mobile pour l'instant. **Peut attendre.**

🔵 **Sans objet** :
6. **Tâches planifiées** — ✅ **aucune table** (dashboard 100 % dérivé de `frequency` + comptage par période). Une table ne se justifierait qu'avec planning + assignation + notifications (pas l'usage actuel).

🔴 **À différer (lourd)** :
7. **Traçabilité aval** (lot → plats servis) — l'amont est déjà couvert (`haccp_trace_detailed.lines` : product_id→supplier_references, lot_number, dlc, + `reception_id` ; production maison → `haccp_production_lots`). L'aval = lien traça ↔ ventes/POS → projet à part (SaaS + POS), pas maintenant.

Config statique (pas forcément SQL) : 14 allergènes, limites T° de référence, règles DLC par catégorie.

## Prochaines actions
1. ~~Groupe A~~ ✅ FAIT (ALTER + câblage SaaS).
2. Cadrer ensemble le schéma **Contrôles T° produit à cœur** (🟢-1) et **NC pivot simple** (🟢-3, SaaS propose).
3. Allergènes sur `products` (🟢-2) : chantier SaaS (ajouter allergens[]/traces[] au catalogue).

## Pages encore mock (par choix, lecture opérationnelle plus tard)
dashboard, temperatures, temperatures-produit, huiles, nettoyage, receptions, tracabilite, non-conformites, allergenes, checklists, etiqueteuse, planning, employes, fournisseurs.
