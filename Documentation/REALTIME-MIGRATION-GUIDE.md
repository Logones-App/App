# Guide de Migration Realtime - Correction Généralisée

## Problème Identifié

Le realtime Supabase ne fonctionne pas correctement avec des filtres complexes côté serveur, particulièrement pour les conditions multiples comme `establishment_id AND organization_id`.

## Solution Appliquée

**Remplacer le filtrage côté serveur par un filtrage côté client.**

## Migration Step-by-Step

### 1. Identifier les Modules à Migrer

Recherchez dans votre code les patterns suivants :

```typescript
// ❌ Pattern à corriger
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'table_name',
  filter: `field1=eq.${value1} AND field2=eq.${value2}` // ❌ Problématique
})
```

### 2. Appliquer la Correction

**Avant (❌ INCORRECT)** :

```typescript
const subscription = supabase
  .channel(`channel_name`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "product_stocks",
      filter: `establishment_id=eq.${establishmentId} AND organization_id=eq.${organizationId}`,
    },
    handleEvent,
  )
  .subscribe();
```

**Après (✅ CORRECT)** :

```typescript
const subscription = supabase
  .channel(`channel_name`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "product_stocks",
      // Pas de filter complexe
    },
    (payload) => {
      // Filtrage côté client
      const record = payload.new || payload.old;
      if (record && record.establishment_id === establishmentId && record.organization_id === organizationId) {
        handleEvent(payload);
      }
    },
  )
  .subscribe();
```

### 3. Mettre à Jour les Types

**Avant** :

```typescript
private subscriptions: RealtimeSubscription[] = [];
```

**Après** :

```typescript
private subscriptions: any[] = []; // Type flexible pour Supabase
```

### 4. Améliorer les Logs

**Avant** :

```typescript
console.log("Event:", event);
```

**Après** :

```typescript
console.log("📡 [Module] realtime event:", event.type, record.id, record.field1, record.field2);
```

## Modules à Vérifier

### 1. Organizations Realtime

**Fichier** : `src/lib/services/realtime/modules/organizations-realtime.ts`

**Vérifier** :

- Filtres sur `organization_id`
- Conditions multiples
- Types de subscription

### 2. Users Realtime

**Fichier** : `src/lib/services/realtime/modules/users-realtime.ts`

**Vérifier** :

- Filtres sur `user_id` ou `organization_id`
- Conditions de permissions
- Gestion des erreurs

### 3. Establishments Realtime

**Fichier** : `src/lib/services/realtime/modules/establishments-realtime.ts`

**Vérifier** :

- Filtres sur `establishment_id` et `organization_id`
- Conditions géographiques
- Logs de débogage

## Checklist de Migration

### ✅ Code

- [ ] Supprimer les filtres complexes côté serveur
- [ ] Implémenter le filtrage côté client
- [ ] Corriger les types TypeScript
- [ ] Ajouter la gestion d'erreurs
- [ ] Améliorer les logs

### ✅ Tests

- [ ] Tester les événements INSERT
- [ ] Tester les événements UPDATE
- [ ] Tester les événements DELETE
- [ ] Vérifier les logs de console
- [ ] Tester la performance

### ✅ Documentation

- [ ] Mettre à jour la documentation
- [ ] Documenter les erreurs à éviter
- [ ] Ajouter des exemples de code
- [ ] Créer des guides de débogage

## Exemples de Migration

### Exemple 1 : Messages Realtime

**Avant** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'messages',
  filter: `organization_id=eq.${organizationId} AND deleted=eq.false`
}, handleMessageEvent)
```

**Après** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'messages'
}, (payload) => {
  const record = payload.new || payload.old;
  if (record &&
      record.organization_id === organizationId &&
      record.deleted === false) {
    console.log('📡 Messages realtime event:', payload.eventType, record.id);
    handleMessageEvent(payload);
  }
})
```

### Exemple 2 : Notifications Realtime

**Avant** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'notifications',
  filter: `user_id=eq.${userId} AND read=eq.false`
}, handleNotificationEvent)
```

**Après** :

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'notifications'
}, (payload) => {
  const record = payload.new || payload.old;
  if (record &&
      record.user_id === userId &&
      record.read === false) {
    console.log('📡 Notifications realtime event:', payload.eventType, record.id);
    handleNotificationEvent(payload);
  }
})
```

## Bonnes Pratiques Post-Migration

### 1. Logs Standardisés

Utilisez un format de log cohérent :

```typescript
console.log("📡 [Module] realtime event:", eventType, recordId, field1, field2);
```

### 2. Gestion d'Erreurs

Toujours wrapper les gestionnaires :

```typescript
try {
  handler(event);
} catch (error) {
  console.error("Erreur dans le gestionnaire d'événements [Module]:", error);
}
```

### 3. Tests de Validation

Créer des scripts de test pour chaque module :

```sql
-- Test pour le module [Module]
UPDATE [table_name]
SET [field] = [new_value], updated_at = NOW()
WHERE [condition];
```

### 4. Monitoring

Surveiller les logs pour détecter :

- Événements non reçus
- Erreurs de filtrage
- Problèmes de performance

## Dépannage Post-Migration

### Problème : Événements non reçus

**Cause** : Filtrage côté client trop restrictif

**Solution** :

```typescript
// Ajouter des logs de débogage
console.log("🔍 Filtrage:", record.field1, "===", value1, "&&", record.field2, "===", value2);
```

### Problème : Performance dégradée

**Cause** : Trop d'événements traités côté client

**Solution** :

```typescript
// Optimiser le filtrage
if (record && record.organization_id === organizationId) {
  // Filtrage secondaire seulement si nécessaire
  if (additionalCondition) {
    handleEvent(payload);
  }
}
```

### Problème : Types TypeScript

**Cause** : Types incompatibles avec Supabase

**Solution** :

```typescript
// Utiliser des types flexibles
private subscriptions: any[] = [];
// Ou créer des types personnalisés
type SupabaseSubscription = any;
```

## Validation de la Migration

### 1. Tests Fonctionnels

- [ ] Événements reçus correctement
- [ ] Filtrage fonctionne
- [ ] Interface mise à jour
- [ ] Pas d'erreurs console

### 2. Tests de Performance

- [ ] Temps de réponse acceptable
- [ ] Utilisation mémoire stable
- [ ] Pas de fuites mémoire
- [ ] Désabonnement propre

### 3. Tests de Robustesse

- [ ] Gestion des déconnexions
- [ ] Reconnexion automatique
- [ ] Gestion des erreurs réseau
- [ ] Récupération après erreur

## Conclusion

Cette migration améliore la fiabilité du realtime en :

- ✅ Éliminant les filtres complexes côté serveur
- ✅ Améliorant la gestion d'erreurs
- ✅ Standardisant les logs
- ✅ Optimisant les performances

Appliquez cette correction à tous vos modules realtime pour une expérience utilisateur cohérente et fiable.
