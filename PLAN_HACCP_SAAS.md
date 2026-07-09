# HACCP SaaS — plan de travail & cadrage POS

> État 2026-07. SaaS = **CONFIG only** (6 tables) ; journaux/registres + lecture « inspecteur » = plus tard. Toute évolution de schéma `haccp_*` = **coordination POS** (sync bidirectionnel, POS tient le SQL + le mobile).

## Fait ✅
- CRUD des 6 tables config (zones, sondes, surfaces, bains, checklists, documents) + auto-seed à la création d'établissement.
- **Cadence `frequency`** (enum 5 valeurs : biquotidien/quotidien/hebdomadaire/mensuel/ponctuel) branchée : sondes (défaut biquotidien), bains + checklists (défaut quotidien) ; `frequency_label` libre conservé sur checklists. Pilote le tableau de bord « Tâches du jour » mobile.
- **Fusion Zones + Surfaces** : page unique « Zones & surfaces » (chaque zone = carte + ses surfaces + « + Surface » pré-rempli ; section « Sans zone »). Ancienne route `surfaces-nettoyage` + entrée nav supprimées.
- **Documents** : correction du bouton d'ouverture (onglet ouvert avant l'await → plus de blocage popup, + toast d'erreur si la signature échoue).

## Groupe A — ALTER config (à valider + appliquer par le POS), puis brancher côté SaaS
Position client : **on va jusqu'au A**, puis stop. Colonnes proposées (noms à confirmer par le POS ; toutes nullable) :
- `haccp_oil_tests` : `color text`, `smell text`.
- `haccp_oil_baths` : `capacity_l numeric`, `oil_type text`, `last_change_at timestamptz`, `zone_id uuid` (FK `haccp_zones`).
- `haccp_cleaning_surfaces` : `description text`, `product text`, `responsible text`.
→ Une fois en base : exposer ces champs dans les pages Équipements (bains) et Zones & surfaces.

## Groupe B — nouvelles tables = chantier FUTUR, cadrage conjoint POS+SaaS
Ne rien créer avant retour POS. Questions envoyées (source de vérité ? déjà géré mobile ? schéma ?) :
1. `haccp_non_conformities` — **pivot PMS**, priorité haute (dashboard/réceptions/huiles/T°/fournisseurs).
2. `haccp_suppliers` — remplacer `supplier_label` texte par FK (agrément CE, certifs, note qualité).
3. **Tâches planifiées** — confirmer si table nécessaire ou 100 % calculé (comptage par période).
4. `haccp_product_temperature_checks` — cuisson/remise en chauffe/service (cooling_records = refroidissement seul).
5. **Traçabilité amont/aval** — lots matière première + lien lot→plats servis (CE 178/2002).
6. **Allergènes** — catalogue plats `allergens[]`/`traces[]` : mobile ou table `products` SaaS existante ?
7. `haccp_employee_trainings` — formations/habilitations/accès mobile.

Config statique (pas forcément SQL) : 14 allergènes, limites T° de référence, règles DLC par catégorie, référentiel huiles.

## Pages encore mock (par choix, lecture opérationnelle plus tard)
dashboard, temperatures, temperatures-produit, huiles, nettoyage, receptions, tracabilite, non-conformites, allergenes, checklists, etiqueteuse, planning, employes, fournisseurs.
