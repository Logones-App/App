# Plan de développement & Suivi - Menus, Produits, Stocks

## Checklist & étapes

- [x] **Correction du schéma relationnel dans la doc**
- [x] **Wireframe/plan d’UI pour la vue “Menus d’un établissement”**
- [x] **Affichage de la liste des menus d’un établissement**
- [x] **Affichage des produits associés à chaque menu (avec prix, type, etc.)**
- [x] **Affichage des produits “hors menu” (stockés mais non proposés actuellement)**
- [x] **Navigation entre menus, produits, stocks**
- [x] **Vue détaillée d’un produit (dans quels menus/établissements, stock, prix)**
- [x] **Vue détaillée d’un menu (horaires, produits, etc.)**
- [x] **Gestion des horaires d’activation des menus (simple)**
- [x] **Prévoir la gestion avancée des horaires (optionnel)**
- [x] **Prévoir la gestion des prix de référence par établissement (optionnel)**
- [x] **Prévoir la page produits au niveau organisation (hors établissement) (optionnel)**
- [x] **Tests et validation UX/UI**
- [x] **Mise à jour continue de ce fichier de suivi**

---

## Tests et validation UX/UI

- Vérifier l’affichage et la navigation sur tous les écrans (menus, produits, stocks)
- Tester les cas limites (produits sans menu, stock négatif, menus sans produits…)
- Valider la cohérence des données affichées (prix, stock, horaires)
- Recueillir les retours utilisateurs pour ajuster l’UX

---

## Page produits au niveau organisation (hors établissement)

- Permettre la gestion centralisée des produits pour toute l’organisation.
- Ajouter, éditer, supprimer des produits “communs” à tous les établissements.
- Associer des produits à un ou plusieurs établissements via l’UI.
- Synchroniser les modifications avec les établissements concernés.

---

## Gestion des prix de référence par établissement (optionnel)

Pour permettre un prix “par défaut” pour un produit dans un établissement (hors menu) :

- Ajouter un champ `default_price` dans la table `product_stocks` ou une table de jointure `products_establishments`.
- Afficher ce prix dans la vue produit et dans la gestion des stocks.
- Permettre l’édition de ce prix dans l’UI.

---

## Gestion avancée des horaires d’activation des menus

Pour permettre des horaires complexes (ex : menu brunch seulement le dimanche, ou plusieurs plages horaires par jour), il faudrait :

- Ajouter une table `menu_schedules` :
  - `id`, `menu_id`, `day_of_week`, `start_time`, `end_time`, `is_active`, etc.
- Permettre la gestion de plusieurs plages horaires par menu et par jour.
- Adapter l’UI pour afficher et éditer ces plages.

---

## Wireframe/Plan d’UI – Vue “Menus d’un établissement”

### Navigation

- [Retour à l’établissement]
- [Onglets ou boutons] : Menus | Produits | Stocks

### Section Menus

- **Liste des menus** (cartes ou tableau)
  - Nom du menu, type, horaires d’activation, statut (actif/public), actions (éditer, supprimer)
  - [Bouton] Ajouter un menu

#### Pour chaque menu sélectionné :

- **Détail du menu**
  - Infos générales (nom, type, horaires, statut)
  - [Bouton] Modifier le menu
  - [Bouton] Supprimer le menu
- **Liste des produits du menu** (tableau)
  - Nom du produit, description, prix (spécifique à ce menu), type, image, actions (éditer prix, retirer du menu)
  - [Bouton] Ajouter un produit au menu (ouvre un sélecteur de produits de l’organisation non déjà dans ce menu)

### Section Produits “hors menu”

- **Liste des produits en stock dans l’établissement mais non associés à un menu**
  - Nom, description, stock actuel, actions (ajouter à un menu, éditer stock)

### Actions principales

- Ajouter un menu
- Ajouter un produit à un menu
- Retirer un produit d’un menu
- Modifier le prix d’un produit dans un menu
- Voir/éditer le stock d’un produit

### UX

- Navigation fluide entre menus, produits, stocks
- Affichage clair des produits “hors menu” pour ne rien oublier
- Actions rapides accessibles (ajout, édition, suppression)

---

## Schéma relationnel corrigé

```
Organization
├── Products (communs à l'organisation)
└── Establishments
    ├── Menus
    │   └── menus_products (prix par menu)
    └── product_stocks (stock par produit/établissement)
```

- **products** : rattachés à l’organisation (et non à l’établissement)
- **establishments** : restaurants/points de vente d’une organisation
- **menus** : menus d’un établissement
- **menus_products** : jointure menu <-> produit (avec prix spécifique au menu)
- **product_stocks** : stock d’un produit pour un établissement donné

---

# Architecture & Affichage - Menus, Produits, Stocks

## 1. Schéma relationnel simplifié

```
Organization
└── Establishments
    ├── Menus
    │   └── menus_products (prix par menu)
    ├── Products (communs à l'organisation)
    └── product_stocks (stock par produit/établissement)
```

- **products** : produits de l'organisation (communs à tous les établissements)
- **establishments** : restaurants/points de vente
- **menus** : menus d'un établissement (ex : Petit-déjeuner, Déjeuner, Dîner)
- **menus_products** : jointure menu <-> produit, avec prix spécifique au menu
- **product_stocks** : stock d'un produit pour un établissement donné

## 2. Règles métier et cas d'usage

- Un produit peut être en stock dans un établissement sans être affiché dans un menu (stock dormant, produit non encore à la carte).
- Un produit peut être dans plusieurs menus d'un même établissement, avec des prix différents (gérés dans menus_products).
- Le stock est géré uniquement par couple (produit, établissement), indépendamment des menus.
- La suppression d'un produit dans un menu n'impacte pas le stock ni la présence du produit dans d'autres menus/établissements.
- Les produits sont communs à tous les établissements d'une organisation (gestion centralisée), mais chaque établissement choisit ses menus et produits à la carte.
- La gestion des horaires d'activation des menus est prévue (menu actif selon l'heure/jour, utile pour l'app mobile de caisse).
- La gestion des prix pourrait être prévue aussi par établissement (prix de référence), mais pour l'instant, seul le prix par menu est utilisé.
- Les seuils de stock, alertes, gestion des stocks négatifs sont déjà prévus dans la structure (voir datatable.type).

## 3. Affichages/logique UI à prévoir

### A. Par établissement

- Vue d'ensemble : infos, accès menus, produits, stocks
- **Menus** :
  - Liste des menus de l'établissement
  - Pour chaque menu : liste des produits associés (avec prix spécifique, type, horaires d'activation)
- **Produits** :
  - Liste des produits de l'organisation
  - Pour chaque produit : dans quels menus il est proposé dans cet établissement, à quel prix
- **Stocks** :
  - Liste des produits avec leur stock actuel pour l'établissement
  - Affichage des produits "hors menu" (stockés mais non vendus actuellement)

### B. Par produit

- Vue détaillée d'un produit :
  - Dans quels établissements il est proposé
  - Dans quels menus de chaque établissement
  - Prix par menu, stock par établissement

### C. Par menu

- Vue détaillée d'un menu :
  - Liste des produits du menu (avec prix, type, etc.)
  - Horaires d'activation du menu

## 4. Questions/réponses (historique de conception)

- Un produit peut-il être absent d’un menu mais présent dans le stock ? **Oui**
- La table menus_products gère-t-elle bien le prix du produit pour chaque menu ? **Oui** (champ price dans menus_products)
- Le stock est-il bien géré uniquement par établissement et produit, sans notion de menu ? **Oui**
- La gestion des horaires d’activation des menus est-elle bien prévue ? **Oui** (sera surtout utile pour l'app mobile de caisse)
- La suppression d’un produit dans un menu n’impacte pas le stock ni la présence du produit dans d’autres menus/établissements ? **Oui**
- La gestion des produits “communs” à plusieurs établissements d’une même organisation est-elle souhaitée/facilitée ? **Oui** (gestion centralisée des produits)
- Un produit peut-il être dans plusieurs menus d’un même établissement avec des prix différents ? **Oui**
- Souhaites-tu une gestion des horaires d’activation des menus (ex : menu “Brunch” seulement le dimanche) ? **Oui**
- La gestion des stocks doit-elle permettre de voir les produits “hors menu” (stockés mais non vendus actuellement) ? **Oui**
- Vue “par produit” ou “par menu” ? **Les deux**
- Gestion des prix par menu uniquement, ou aussi par établissement ? **Prévoir la possibilité par établissement (prix de référence), mais non prioritaire**
- Faut-il prévoir la gestion des stocks négatifs/interdits, ou des alertes de seuil ? **Oui, déjà prévu dans la structure**

## 5. TODO/Futur

- Prévoir la page produits au niveau organisation (hors établissement)
- Prévoir la gestion des prix de référence par établissement si besoin
- Prévoir la gestion avancée des horaires d'activation des menus
- Prévoir la gestion des produits "hors menu" dans les vues stocks

---

**Ce fichier sert de référence pour toute l'architecture menus/produits/stocks. À compléter au fil des développements.**
