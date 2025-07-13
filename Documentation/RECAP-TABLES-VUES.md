# 📋 RÉCAPITULATIF DES TABLES ET VUES

## 🗄️ TABLES PRINCIPALES

### **AUTHENTIFICATION & UTILISATEURS**

- **`profiles`** : Profils utilisateurs étendus (complément à auth.users)
- **`users_organizations`** : Relation many-to-many entre utilisateurs et organisations avec rôles
- **`user_features`** : Permissions granulaires par fonctionnalité

### **ORGANISATIONS & ÉTABLISSEMENTS**

- **`organizations`** : Organisations clientes du SaaS
- **`establishments`** : Établissements de restauration
- **`custom_domains`** : Domaines personnalisés par établissement

### **PRODUITS & MENUS**

- **`products`** : Produits/plats des restaurants
- **`categories`** : Catégories de produits (avec hiérarchie parent/enfant)
- **`menus`** : Menus des établissements
- **`menus_products`** : Relation many-to-many entre menus et produits avec prix

### **RÉSERVATIONS & CRÉNEAUX**

- **`bookings`** : Réservations clients
- **`booking_slots`** : Créneaux de réservation configurés
- **`available_slots_cache`** : Cache des créneaux disponibles
- **`opening_hours`** : Horaires d'ouverture
- **`opening_hours_exceptions`** : Exceptions aux horaires (fermetures, etc.)

### **STOCK & INVENTAIRE**

- **`product_stocks`** : Stock des produits par organisation
- **`stock_movements`** : Mouvements de stock (entrées/sorties)
- **`work_sessions`** : Sessions de travail pour traçabilité
- **`category_grid_items`** : Grille d'affichage des catégories/produits

### **COMMANDES & PAIEMENTS**

- **`orders`** : Commandes clients
- **`orders_payments`** : Paiements des commandes
- **`orders_rows`** : Lignes de commande
- **`orders_rows_parts`** : Parties des lignes de commande
- **`daily_found`** : Caisse quotidienne

### **COMMUNICATION**

- **`email_templates`** : Templates d'emails
- **`email_logs`** : Logs d'envoi d'emails
- **`messages`** : Messages système

### **MOBILE APP**

- **`tables`** : Tables des restaurants
- **`rooms`** : Salles des restaurants
- **`tables_connections`** : Connexions entre tables
- **`vat_rate`** : Taux de TVA

## 👁️ VUES PRINCIPALES

### **AFFICHAGE & INTERFACE**

- **`category_grids_view`** : Vue complète pour l'affichage des grilles de catégories/produits
- **`active_menus`** : Menus actifs filtrés
- **`active_menus_with_products`** : Menus avec leurs produits
- **`active_profiles`** : Profils utilisateurs actifs
- **`active_users_organizations`** : Relations utilisateurs-organisations actives

### **STOCK & INVENTAIRE**

- **`stock_alerts_view`** : Alertes de stock (critique, faible)
- **`recent_stock_movements_view`** : Mouvements de stock récents avec détails
- **`active_work_sessions`** : Sessions de travail actives

### **RÉSERVATIONS**

- **`active_bookings`** : Réservations actives
- **`active_opening_hours`** : Horaires d'ouverture actifs
- **`active_opening_hours_exceptions`** : Exceptions actives

### **PERMISSIONS & ADMIN**

- **`org_admin_permissions`** : Permissions des administrateurs d'organisation
- **`system_admin_permissions`** : Permissions des administrateurs système

### **ANALYTICS & RAPPORTS**

- **`email_stats`** : Statistiques d'envoi d'emails
- **`failed_emails`** : Emails en échec

## 🔧 FONCTIONS PRINCIPALES

### **STOCK**

- `add_stock_movement()` : Ajouter un mouvement de stock
- `get_available_stock()` : Obtenir le stock disponible
- `reserve_stock()` / `unreserve_stock()` : Réserver/annuler réservation
- `get_stock_alerts()` : Obtenir les alertes de stock

### **RÉSERVATIONS**

- `generate_booking_slots_for_date()` : Générer les créneaux pour une date
- `get_available_slots_on_demand()` : Obtenir les créneaux disponibles
- `update_slot_capacity()` : Mettre à jour la capacité d'un créneau

### **UTILITAIRES**

- `soft_delete_record()` / `hard_delete_record()` : Suppression logique/physique
- `cleanup_old_cache()` : Nettoyage du cache
- `send_booking_reminders()` : Envoi de rappels de réservation

## 📝 NOTES IMPORTANTES

- **Soft Delete** : La plupart des tables utilisent un champ `deleted` pour la suppression logique
- **Multi-tenancy** : Chaque table a un `organization_id` pour l'isolation des données
- **Traçabilité** : Les tables ont des champs `created_by`, `updated_by`, `created_at`, `updated_at`
- **RLS** : Row Level Security activé pour l'isolation des données par organisation
- **Cache** : Système de cache pour les créneaux de réservation pour les performances
