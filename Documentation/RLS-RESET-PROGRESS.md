# 🗂️ Suivi de Migration RLS & Nettoyage user_id

## Procédure à suivre pour chaque table

1. **Supprimer toutes les policies existantes**
2. **Migrer user_id → created_by** (si la table a un champ user_id)
   - Ajouter la colonne created_by si besoin
   - Copier la valeur de user_id dans created_by
   - Supprimer la colonne user_id
3. **Créer les 4 policies universelles (SELECT, INSERT, UPDATE, DELETE)**
4. **Activer RLS**

---

## Objectif

- Supprimer toute logique de rôle ou de user_id dans les policies RLS
- Migrer user_id -> created_by (optionnel) pour la traçabilité
- Appliquer les policies universelles (voir RLS-POLICIES-STANDARD.md)

---

## 1️⃣ Checklist : Tables métiers à migrer (user_id -> created_by)

| Table                    | Policies supprimées | user_id -> created_by | Policies universelles recréées | Fait |
| ------------------------ | :-----------------: | :-------------------: | :----------------------------: | :--: |
| products                 |         [x]         |          [x]          |              [x]               | [x]  |
| categories               |         [x]         |          [x]          |              [x]               | [x]  |
| menus                    |         [x]         |          [x]          |              [x]               | [x]  |
| establishments           |         [x]         |          [x]          |              [x]               | [x]  |
| rooms                    |         [x]         |          [x]          |              [x]               | [x]  |
| tables                   |         [x]         |          [x]          |              [x]               | [x]  |
| menus_products           |         [x]         |          [x]          |              [x]               | [x]  |
| vat_rate                 |         [x]         |          [x]          |              [x]               | [x]  |
| printers                 |         [x]         |          [x]          |              [x]               | [x]  |
| daily_found              |         [x]         |          [x]          |              [x]               | [x]  |
| stock_movements          |         [x]         |          [x]          |              [x]               | [x]  |
| work_sessions            |         [x]         |          [x]          |              [x]               | [x]  |
| category_grid_items      |         [x]         |          [x]          |              [x]               | [x]  |
| orders                   |         [x]         |          [x]          |              [x]               | [x]  |
| orders_payments          |         [x]         |          [x]          |              [x]               | [x]  |
| orders_payments_rows     |         [x]         |          [x]          |              [x]               | [x]  |
| orders_rows              |         [x]         |          [x]          |              [x]               | [x]  |
| orders_rows_parts        |         [x]         |          [x]          |              [x]               | [x]  |
| ~~todos~~                |                     |                       |                                |      |
| ~~todos1~~               |                     |                       |                                |      |
| messages                 |         [x]         |          [x]          |              [x]               | [x]  |
| opening_hours            |         [x]         |          [x]          |              [x]               | [x]  |
| opening_hours_exceptions |         [x]         |          [x]          |              [x]               | [x]  |
| custom_domains           |         [x]         |          [x]          |              [x]               | [x]  |
| product_stocks           |         [x]         |          [x]          |              [x]               | [x]  |
| email_logs               |         [x]         |          [x]          |              [x]               | [x]  |
| email_templates          |         [x]         |          [x]          |              [x]               | [x]  |
| tables_connections       |         [x]         |          [x]          |              [x]               | [x]  |

---

## 2️⃣ Checklist : Tables structurelles ou sans user_id (policies universelles uniquement)

| Table               | Policies supprimées | Policies universelles recréées | Fait |
| ------------------- | :-----------------: | :----------------------------: | :--: |
| users_organizations |         [x]         |              [x]               | [x]  |
| profiles            |         [ ]         |              [ ]               | [ ]  |
| users               |         [ ]         |              [ ]               | [ ]  |
| bookings            |         [ ]         |              [ ]               | [ ]  |
| booking_slots       |         [ ]         |              [ ]               | [ ]  |
| organizations       |         [ ]         |              [ ]               | [ ]  |

---

**Instructions** :

- Pour chaque table, cocher chaque étape une fois réalisée.
- Utiliser le script `scripts/migrate-userid-to-createdby-and-reset-rls.sql` pour les tables métiers.
- Se référer à `RLS-POLICIES-STANDARD.md` pour le template universel.
- Après migration, vérifier l'accès, la traçabilité et la conformité des policies.
