# 🎯 Directives de Collaboration - Projet SaaS Dashboard Restaurant

## 📋 Règles de Communication

### Langue

- **Toujours répondre en français**
- Utiliser un ton professionnel mais accessible

### Rythme de travail

- **Ralentir le rythme** et valider chaque étape avant exécution
- **Poser des questions** dès qu'il y a un doute
- **Suggérer la meilleure approche** quand plusieurs options existent
- **Analyser en profondeur l'existant** avant de proposer de nouvelles fonctionnalités

### Objectivité et force de proposition

- **Être objectif** et ne pas hésiter à être force de proposition
- **Dire clairement** si l'utilisateur se trompe ou fait un mauvais choix
- **Justifier les recommandations** avec des arguments concrets
- **Proposer des alternatives** quand une approche n'est pas optimale

### Questions et clarifications

- **Fournir des requêtes SQL** pour tester la structure de la base de données
- **Attendre les résultats** avant de proposer des solutions
- **Ajuster la fréquence des questions** selon les besoins
- **Poser des séries de questions structurées** pour clarifier les besoins

## 🏗️ Structure du Projet

### Type de projet

- **SaaS Dashboard Next.js** avec système de réservation restaurant
- **Back-office complet** pour gestion des organisations/établissements
- **Système de rôles et permissions** intégré
- **App Mobile Caisse** (React Native) pour serveurs en salle
- **Synchronisation temps réel** entre dashboard et mobile

### Technologies principales

- **Next.js 15.3.4** avec App Router
- **Supabase** avec RLS (Row Level Security)
- **LegendState** pour l'état global et synchronisation temps réel
- **Shadcn/UI** + Tailwind CSS
- **next-intl** pour l'internationalisation
- **React Native** pour l'app mobile caisse

### Base de données

- **Fichier de types** : `src/lib/supabase/database.types.ts`
- **Mettre à jour ce fichier** après chaque modification de la BDD
- **Utiliser les vraies tables** : `users_organizations` (pas `user_organizations`)
- **Rôle principal** : `org_admin`
- **Système de permissions** : Tables `features` + `user_features`

## 📁 Organisation des Fichiers

### Scripts SQL

- **Emplacement** : `scripts/`
- **Exemple** : `scripts/email-system.sql`
- **Toujours fournir le chemin complet** dans les marches à suivre

### Services

- **Emplacement** : `src/lib/services/`
- **Exemple** : `src/lib/services/email-service.ts`

### Composants

- **Emplacement** : `src/components/`
- **Utiliser Shadcn/UI** pour l'interface

### Stores LegendState

- **Emplacement** : `src/lib/stores/`
- **Exemple** : `src/lib/stores/menuStore.ts`
- **Synchronisation temps réel** avec Supabase

## 🔧 Bonnes Pratiques

### Base de données

1. **Vérifier la structure réelle** via `database.types.ts`
2. **Tester avec des requêtes SQL** avant d'implémenter
3. **Utiliser les vues `active_*`** pour filtrer les suppressions logiques
4. **Ajouter `deleted = false`** dans les requêtes
5. **Standardiser les soft deletes** sur `deleted = false`

### Sécurité

- **RLS activé** sur toutes les nouvelles tables
- **Politiques basées sur les vraies relations** :
  - `users_organizations` pour les org_admins
  - `establishments.user_id` pour les utilisateurs
- **Permissions granulaires** par établissement et type d'opération

### Code

- **TypeScript strict** pour tous les nouveaux fichiers
- **Gestion d'erreurs** appropriée
- **Commentaires** pour les logiques complexes
- **Synchronisation temps réel** avec gestion des conflits

## 🍽️ Contexte Restaurant - Architecture Complète

### Workflow Restaurant

1. **Client** réserve sur le site public du restaurant
2. **Email de confirmation** automatique
3. **Staff** voit la réservation (dashboard + mobile)
4. **Staff** attribue la réservation à une table spécifique
5. **Serveur** voit la réservation assignée sur l'app mobile
6. **Serveur** prend la commande → `orders` liée à la table
7. **Caisse** enregistre les paiements → `orders_payments`
8. **Rappel automatique** 24h avant
9. **Gestion des annulations/modifications**

### Rôles et Permissions

- **system_admin** : Vous et votre équipe (gestion de la plateforme)
- **org_admin** : Gestionnaire de chaîne de restaurants
- **manager** : Chef de salle d'un restaurant
- **staff** : Serveurs, hôtesses d'accueil
- **viewer** : Stagiaires, observateurs

### Tables Métier Partagées (Realtime)

- `establishments` = Restaurants individuels
- `tables` = Tables physiques avec disposition
- `rooms` = Salles (terrasse, salle principale, etc.)
- `menus` = Carte du restaurant
- `products` = Plats, boissons
- `categories` = Entrées, plats, desserts, etc.
- `orders` = Commandes en salle
- `orders_payments` = Paiements (app caisse)
- `orders_rows` = Lignes de commandes (app caisse)
- `bookings` = Réservations (dashboard + mobile)
- `vat_rate` = Taux de TVA

## 📱 Système de Stock Temps Réel

### Architecture Recommandée

#### Tables de Base de Données

```sql
-- Table principale des stocks
CREATE TABLE product_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0, -- Seuil d'alerte
  max_quantity INTEGER, -- Stock maximum (optionnel)
  allow_negative BOOLEAN DEFAULT false, -- Paramètre établissement
  version INTEGER DEFAULT 1, -- Pour la gestion des conflits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, establishment_id)
);

-- Logs par session de travail
CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  establishment_id UUID REFERENCES establishments(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_sales INTEGER DEFAULT 0,
  total_stock_changes INTEGER DEFAULT 0
);

-- Mouvements de stock par session
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  establishment_id UUID REFERENCES establishments(id),
  work_session_id UUID REFERENCES work_sessions(id),
  user_id UUID REFERENCES users(id),
  movement_type TEXT NOT NULL, -- 'sale', 'restock', 'adjustment'
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Gestion des Conflits

- **Stratégie** : "Optimistic Update" avec rollback
- **Mise à jour immédiate** de l'UI pour réactivité
- **Gestion des conflits** avec versioning
- **Notifications** en cas de conflit

#### Interface Mobile

- **Indicateurs visuels** : vert/jaune/rouge selon le niveau
- **Quantité restante** affichée directement
- **Mise à jour temps réel** sans polling

### Permissions Granulaires

#### Features par Établissement

```sql
-- Features existantes + nouvelles
INSERT INTO features (id, name, description) VALUES
('product_read', 'Lecture des produits', 'Voir les produits de l''établissement'),
('product_create', 'Création de produits', 'Créer de nouveaux produits'),
('product_update', 'Modification de produits', 'Modifier les produits existants'),
('product_delete', 'Suppression de produits', 'Supprimer des produits'),
('stock_read', 'Lecture des stocks', 'Voir les niveaux de stock'),
('stock_update', 'Modification des stocks', 'Modifier les quantités en stock'),
('category_manage', 'Gestion des catégories', 'Gérer les catégories de produits');

-- Permissions par établissement
CREATE TABLE establishment_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  feature_id TEXT REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, establishment_id, feature_id)
);
```

## 📧 Système d'Emails (Implémenté)

### Tables créées

- `email_logs` : Traçabilité des emails
- `email_templates` : Templates personnalisables

### Templates par défaut

- `booking_confirmation` : Confirmation de réservation
- `booking_reminder` : Rappel 24h avant
- `booking_cancellation` : Annulation

### Service d'envoi

- **Fichier** : `src/lib/services/email-service.ts`
- **SMTP** : Brevo (smtp-relay.brevo.com:587)
- **Configuration** : Variables d'environnement dans `.env.local`

### Fonctionnalités

- **Triggers automatiques** pour les confirmations
- **Service d'envoi** avec Nodemailer + SMTP Brevo
- **Templates dynamiques** avec remplacement de variables
- **Gestion des erreurs** et retry automatique
- **API de test** : `/api/email/test`
- **Interface d'administration** : `/admin/email-test`
- **Fonction de rappel** (`send_booking_reminders()`)
- **Nettoyage automatique** (`cleanup_old_email_logs()`)
- **Vues statistiques** (`email_stats`, `failed_emails`)

### Variables d'environnement

```bash
BREVO_SMTP_USER=8f4071001@smtp-brevo.com
BREVO_SMTP_PASSWORD=c7KCzndYEODTaNsq
EMAIL_FROM=noreply@votre-domaine.com
```

## 🚀 Marches à Suivre

### Format standard

1. **Numéro et titre** de l'étape
2. **Lien vers le script** concerné
3. **Commandes à exécuter**
4. **Vérifications à faire**

### Exemple

````markdown
### 1. Exécuter le script SQL

**Fichier** : `scripts/email-system.sql`

```bash
# Commande d'exécution
```
````

**Vérification** :

```sql
-- Requête de test
```

```

## 🔄 Workflow de Développement

### Pour chaque nouvelle fonctionnalité
1. **Analyser la structure existante**
2. **Poser des questions** si nécessaire
3. **Proposer la meilleure approche**
4. **Implémenter étape par étape**
5. **Tester et valider**
6. **Documenter les changements**

### Gestion des erreurs
- **Identifier la cause** avec des requêtes de diagnostic
- **Proposer des corrections** basées sur la vraie structure
- **Tester les corrections** avant de continuer

## 📝 Notes Importantes

### Relations clés
- `users_organizations` : Relation user ↔ organisation
- `establishments.user_id` : Gestionnaire de l'établissement
- `bookings.organization_id` : Organisation de la réservation

### Filtres importants
- `deleted = false` : Éviter les enregistrements supprimés
- `status = 'confirmed'` : Réservations confirmées uniquement

### Rôles et permissions
- `org_admin` : Administrateur d'organisation
- Accès basé sur `organization_id` pour les org_admins
- Accès basé sur `establishment_id` pour les utilisateurs

## 🧹 Nettoyage et Organisation

### Nettoyage automatique
- **Supprimer les fichiers temporaires** après chaque session
- **Nettoyer les scripts SQL de test** une fois utilisés
- **Supprimer les API routes de test** après validation
- **Maintenir une structure de projet propre**
- **Nettoyer la base de données** après chaque session de développement

### Scripts de nettoyage BDD
- **Nettoyage simple** : `scripts/cleanup-simple.sql`
  - Supprime les templates d'emails obsolètes (remplacés par HTML)
  - Supprime les anciens logs d'emails
  - Nettoie les relations orphelines
  - **CONSERVE** les données de test et utilisateur
  - **Sans VACUUM** (évite les erreurs de transaction)
- **Optimisation manuelle** : Exécuter `VACUUM ANALYZE;` séparément si nécessaire

### Templates et Assets
- **Utiliser des templates HTML professionnels** pour les emails
- **Stockage** : `src/lib/email/templates/`
- **Service de gestion** : `src/lib/email/templateService.ts`
- **Designs responsives et modernes** obligatoires

### Gestion des Sessions
- **Marquer clairement les directives mises à jour**
- **Documenter les nouvelles fonctionnalités ajoutées**
- **Maintenir un historique des améliorations**
- **Faciliter la reprise de travail entre sessions**

## ✅ Système de Réservation (TERMINÉ)

### Fonctionnalités implémentées
- **API route sécurisée** : `/api/booking/create`
- **Templates HTML professionnels** pour les emails
- **Service de gestion des templates** avec variables dynamiques
- **Validation côté serveur** complète
- **Gestion d'erreurs robuste**
- **Emails automatiques** de confirmation

### Architecture finale
- **Sécurité** : Clé de service Supabase (bypass RLS)
- **Templates** : HTML personnalisables dans l'application
- **Validation** : Côté serveur avec vérifications complètes
- **Robustesse** : Fallback vers templates par défaut

## 🎯 Priorités de Développement

### Phase 1 : Structure et CRUD Temps Réel (Priorité Immédiate)
1. **CRUD Complet Produits/Catégories/Établissements/Organisations**
2. **Gestion des Stocks Temps Réel**
3. **Système de Permissions Granulaire**

### Phase 2 : Fonctionnalités Business (Plus Tard)
1. **Attribution Réservations → Tables**
2. **Paiements Stripe**
3. **Rapports avec Recharts**

### Phase 3 : App Mobile (React Native)
1. **Synchronisation temps réel** avec le même client Supabase
2. **Gestion des commandes en salle**
3. **Notifications temps réel**

---

**Dernière mise à jour :** 3 juillet 2025
**Version :** 3.0
**Statut :** Système de réservation terminé ✅ | Stock temps réel en cours 🚧
```
