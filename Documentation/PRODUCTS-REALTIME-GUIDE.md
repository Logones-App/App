# Guide du Realtime des Produits

## Vue d'ensemble

Le système realtime des produits permet de synchroniser automatiquement les modifications de la table `products` et `product_stocks` en temps réel dans l'interface utilisateur.

## Architecture

### 1. Module Realtime (`products-realtime.ts`)

**Fichier** : `src/lib/services/realtime/modules/products-realtime.ts`

**Fonctionnalités** :

- Abonnement aux changements de `products` et `product_stocks`
- Gestion des événements INSERT, UPDATE, DELETE
- Filtrage côté client par `establishment_id` et `organization_id`
- Système de gestionnaires d'événements

**Classes et Interfaces** :

```typescript
interface ProductsRealtimeEvent {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: "products" | "product_stocks";
  record: any;
  oldRecord?: any;
}

class ProductsRealtime {
  subscribeToEstablishmentProducts(establishmentId, organizationId, onEvent);
  addEventHandler(handler);
  unsubscribe();
}
```

### 2. Hook React (`use-products-realtime.ts`)

**Fichier** : `src/hooks/use-products-realtime.ts`

**Fonctionnalités** :

- Intégration avec React Query
- Rafraîchissement automatique du cache
- Gestion du cycle de vie des composants
- Logs de débogage

**API** :

```typescript
const { forceRefresh, refreshProducts } = useProductsRealtime(establishmentId, organizationId);
```

### 3. Composant Principal (`products-shared.tsx`)

**Intégration** :

- Utilisation du hook `useProductsRealtime`
- Affichage du statut realtime (badge vert animé)
- Bouton de rafraîchissement manuel
- Mise à jour automatique du tableau

## Fonctionnement

### 1. Abonnement aux Changements

```typescript
// Abonnement à product_stocks (SANS filtre côté serveur)
const productStocksSubscription = supabase
  .channel(`product_stocks_${establishmentId}_${organizationId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "product_stocks",
      // ⚠️ PAS de filter ici !
    },
    (payload) => {
      // ✅ Filtrage côté client
      const record = payload.new || payload.old;
      if (record && record.establishment_id === establishmentId && record.organization_id === organizationId) {
        // Traitement de l'événement
      }
    },
  )
  .subscribe();

// Abonnement à products (SANS filtre côté serveur)
const productsSubscription = supabase
  .channel(`products_${organizationId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "products",
      // ⚠️ PAS de filter ici !
    },
    (payload) => {
      // ✅ Filtrage côté client
      const record = payload.new || payload.old;
      if (record && record.organization_id === organizationId) {
        // Traitement de l'événement
      }
    },
  )
  .subscribe();
```

### 2. Gestion des Événements

Chaque modification déclenche :

1. **Log de l'événement** dans la console
2. **Rafraîchissement des données** via React Query
3. **Mise à jour de l'interface** automatique

### 3. Types d'Événements Supportés

- **INSERT** : Nouveau produit ou stock
- **UPDATE** : Modification de produit ou stock
- **DELETE** : Suppression (soft delete)

## ❌ Erreurs à Éviter

### 1. Filtres Complexes Côté Serveur

**❌ INCORRECT** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'product_stocks',
  filter: `establishment_id=eq.${establishmentId} AND organization_id=eq.${organizationId}` // ❌ Ne fonctionne pas
})
```

**✅ CORRECT** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'product_stocks'
  // Pas de filter complexe
}, (payload) => {
  // Filtrage côté client
  const record = payload.new || payload.old;
  if (record &&
      record.establishment_id === establishmentId &&
      record.organization_id === organizationId) {
    // Traitement
  }
})
```

### 2. Types TypeScript Incorrects

**❌ INCORRECT** :

```typescript
private subscriptions: RealtimeSubscription[] = []; // ❌ Type incorrect
```

**✅ CORRECT** :

```typescript
private subscriptions: any[] = []; // ✅ Type flexible pour Supabase
```

### 3. Gestion d'Erreurs Insuffisante

**❌ INCORRECT** :

```typescript
this.eventHandlers.forEach((handler) => handler(event)); // ❌ Pas de try/catch
```

**✅ CORRECT** :

```typescript
this.eventHandlers.forEach((handler) => {
  try {
    handler(event);
  } catch (error) {
    console.error("Erreur dans le gestionnaire d'événements:", error);
  }
});
```

### 4. Logs Insuffisants

**❌ INCORRECT** :

```typescript
console.log("Event:", event); // ❌ Pas assez détaillé
```

**✅ CORRECT** :

```typescript
console.log(
  "📡 Product stocks realtime event:",
  event.type,
  record.id,
  record.establishment_id,
  record.organization_id,
);
```

## Cas d'Usage

### 1. Modification de Stock

**Scénario** : Un utilisateur modifie le stock d'un produit

**Flux** :

1. Modification en base de données
2. Événement realtime déclenché
3. Rafraîchissement automatique du tableau
4. Mise à jour du statut (Rupture, OK, etc.)

### 2. Association de Produit

**Scénario** : Association d'un produit existant à un établissement

**Flux** :

1. Insertion dans `product_stocks`
2. Événement realtime INSERT
3. Apparition du produit dans le tableau
4. Statut "Stock non géré" (-1)

### 3. Modification de Produit

**Scénario** : Modification du nom ou prix d'un produit

**Flux** :

1. Update sur la table `products`
2. Événement realtime UPDATE
3. Mise à jour de l'affichage
4. Conservation du stock associé

## Débogage

### 1. Logs Console

```javascript
// Connexion
🔌 Products realtime: abonnement pour [establishmentId] [organizationId]

// Événements products
📡 Products realtime event: UPDATE products [productId] [organizationId]

// Événements product_stocks
📡 Product stocks realtime event: UPDATE [stockId] [establishmentId] [organizationId]

// Rafraîchissement
🔄 Products realtime: données rafraîchies 3 produits

// Déconnexion
🔌 Products realtime: désabonnement pour [establishmentId] [organizationId]
```

### 2. Indicateurs Visuels

- **Badge vert animé** : Realtime actif
- **Bouton "Actualiser"** : Rafraîchissement manuel
- **Animation de chargement** : Mise à jour en cours

### 3. Scripts de Test

**Fichier** : `scripts/test-products-realtime.sql`

**Utilisation** :

1. Exécuter les requêtes de diagnostic
2. Décommenter les tests de modification
3. Observer les changements en temps réel

## Performance

### 1. Optimisations

- **Filtrage côté client** : Seuls les événements pertinents traités
- **Cache React Query** : Évite les requêtes inutiles
- **Désabonnement automatique** : Nettoyage des ressources
- **Logs conditionnels** : Débogage sans impact performance

### 2. Limitations

- **Latence réseau** : Dépend de la connexion
- **Concurrence** : Gestion des modifications simultanées
- **Échelle** : Nombre d'abonnements simultanés

## Sécurité

### 1. Filtrage des Données

- **RLS (Row Level Security)** : Accès contrôlé
- **Filtrage côté client** : Isolation des données
- **Validation côté serveur** : Intégrité des données

### 2. Gestion des Erreurs

```typescript
try {
  handler(event);
} catch (error) {
  console.error("Erreur dans le gestionnaire d'événements:", error);
}
```

## Maintenance

### 1. Monitoring

- **Logs de connexion** : Vérifier les abonnements
- **Logs d'événements** : Tracer les modifications
- **Logs d'erreurs** : Détecter les problèmes

### 2. Tests

- **Tests unitaires** : Fonctionnalités individuelles
- **Tests d'intégration** : Flux complet
- **Tests de charge** : Performance sous stress

## Troubleshooting

### 1. Problèmes Courants

**Realtime ne fonctionne pas pour product_stocks** :

- ❌ Vérifier les filtres côté serveur (ne pas en utiliser)
- ✅ Vérifier le filtrage côté client
- ✅ Contrôler les logs de console
- ✅ Tester avec le script SQL

**Données non synchronisées** :

- Vérifier les filtres RLS
- Contrôler les permissions
- Tester le rafraîchissement manuel

**Performance dégradée** :

- Réduire le nombre d'abonnements
- Optimiser les requêtes
- Implémenter la pagination

### 2. Solutions

**Redémarrage du realtime** :

```typescript
const { forceRefresh } = useProductsRealtime(establishmentId, organizationId);
forceRefresh(); // Rafraîchissement manuel
```

**Vérification des abonnements** :

```sql
-- Vérifier les connexions actives
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%supabase%';
```

## Bonnes Pratiques

### 1. Développement

- ✅ **Toujours filtrer côté client** pour les conditions complexes
- ✅ **Utiliser des logs détaillés** avec emojis pour identification
- ✅ **Gérer les erreurs** dans tous les gestionnaires d'événements
- ✅ **Nettoyer les abonnements** dans useEffect cleanup

### 2. Production

- ✅ **Monitorer les logs** pour détecter les problèmes
- ✅ **Tester les scénarios** de déconnexion/reconnexion
- ✅ **Optimiser les requêtes** de rafraîchissement
- ✅ **Documenter les changements** de configuration

## Évolutions Futures

### 1. Améliorations Possibles

- **Optimistic updates** : Mise à jour immédiate de l'UI
- **Batch updates** : Regroupement des modifications
- **WebSocket fallback** : Alternative en cas de problème
- **Compression** : Réduction de la bande passante

### 2. Nouvelles Fonctionnalités

- **Notifications push** : Alertes en temps réel
- **Historique des modifications** : Audit trail
- **Synchronisation offline** : Mode hors ligne
- **Multi-établissements** : Vue globale
