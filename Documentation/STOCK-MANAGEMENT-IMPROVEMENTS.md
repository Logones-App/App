# Améliorations de la Gestion des Stocks

## Vue d'ensemble

Amélioration de l'interface de modification des stocks pour permettre la gestion complète des états de stock, y compris le stock non géré (-1).

## Fonctionnalités Ajoutées

### 1. Boutons de Sélection Rapide

**Localisation** : Modal d'édition de stock (`products-shared.tsx`)

**Boutons disponibles** :

- **"Stock non géré (-1)"** : Désactive la gestion de stock pour ce produit
- **"Rupture (0)"** : Met le stock à zéro (gestion activée mais quantité nulle)

### 2. Indicateurs Visuels

**Badges de statut** :

- 🟡 **"Stock non géré"** : `current_stock = -1`
- 🔴 **"Rupture"** : `current_stock = 0`
- 🟢 **"En stock"** : `current_stock > 0`

### 3. Validation des Champs

**Champ "Stock actuel"** :

- ✅ **Minimum** : `-1` (stock non géré)
- ✅ **Placeholder** : "0 ou plus"
- ✅ **Validation** : Accepte les valeurs négatives

**Champ "Stock minimum"** :

- ✅ **Minimum** : `0` (pas de stock minimum négatif)
- ✅ **Validation** : Valeurs positives uniquement

## Logique Métier

### États de Stock

| Valeur | Statut         | Description                                  | Badge             |
| ------ | -------------- | -------------------------------------------- | ----------------- |
| `-1`   | Stock non géré | Produit associé mais sans suivi de stock     | 🟡 Stock non géré |
| `0`    | Rupture        | Gestion de stock activée mais quantité nulle | 🔴 Rupture        |
| `> 0`  | En stock       | Stock disponible                             | 🟢 En stock       |

### Comportement de l'Interface

1. **Affichage en temps réel** : Le badge change automatiquement selon la valeur
2. **Boutons contextuels** : Permettent de passer rapidement d'un état à l'autre
3. **Validation** : Empêche les valeurs invalides (< -1)
4. **Feedback visuel** : Couleurs et icônes pour identifier rapidement l'état

## Code Implémenté

### Structure HTML

```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Input
      type="number"
      min="-1"
      value={editStockForm.current_stock}
      onChange={handleStockChange}
      placeholder="0 ou plus"
    />
    {/* Badges de statut conditionnels */}
    {editStockForm.current_stock === -1 && <Badge variant="secondary">Stock non géré</Badge>}
    {editStockForm.current_stock === 0 && <Badge variant="destructive">Rupture</Badge>}
    {editStockForm.current_stock > 0 && <Badge variant="default">En stock</Badge>}
  </div>

  <div className="flex gap-2">
    <Button onClick={() => setStock(-1)}>Stock non géré (-1)</Button>
    <Button onClick={() => setStock(0)}>Rupture (0)</Button>
  </div>

  <p className="text-muted-foreground text-xs">-1 = Stock non géré, 0 = Rupture, &gt;0 = Stock disponible</p>
</div>
```

### Gestion des États

```typescript
// Mise à jour du stock
const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = parseInt(e.target.value) || 0;
  setEditStockForm({
    ...editStockForm,
    current_stock: value,
  });
};

// Boutons de sélection rapide
const setStockToNonManaged = () => {
  setEditStockForm({
    ...editStockForm,
    current_stock: -1,
  });
};

const setStockToOutOfStock = () => {
  setEditStockForm({
    ...editStockForm,
    current_stock: 0,
  });
};
```

## Avantages

### 1. Expérience Utilisateur

- ✅ **Sélection rapide** : Boutons pour les états courants
- ✅ **Feedback visuel** : Badges colorés pour identifier l'état
- ✅ **Validation en temps réel** : Empêche les valeurs invalides
- ✅ **Aide contextuelle** : Texte explicatif des valeurs

### 2. Fonctionnalité

- ✅ **Gestion complète** : Tous les états de stock supportés
- ✅ **Cohérence** : Aligné avec la logique métier
- ✅ **Flexibilité** : Saisie manuelle ou sélection rapide
- ✅ **Validation** : Respect des contraintes de base de données

### 3. Maintenance

- ✅ **Code clair** : Structure logique et lisible
- ✅ **Réutilisable** : Pattern applicable à d'autres formulaires
- ✅ **Extensible** : Facile d'ajouter de nouveaux états
- ✅ **Documenté** : Comportement explicite

## Tests Recommandés

### 1. Tests Fonctionnels

- [ ] Saisie manuelle de -1, 0, et valeurs positives
- [ ] Clic sur bouton "Stock non géré (-1)"
- [ ] Clic sur bouton "Rupture (0)"
- [ ] Changement de badge selon la valeur
- [ ] Validation des valeurs invalides (< -1)

### 2. Tests d'Interface

- [ ] Affichage correct des badges
- [ ] Responsive design sur mobile
- [ ] Accessibilité (labels, aria-labels)
- [ ] Cohérence visuelle avec le reste de l'interface

### 3. Tests d'Intégration

- [ ] Sauvegarde en base de données
- [ ] Mise à jour du tableau principal
- [ ] Synchronisation realtime
- [ ] Gestion des erreurs

## Évolutions Futures

### 1. Améliorations Possibles

- **Sélecteur de valeurs prédéfinies** : Dropdown avec options courantes
- **Historique des modifications** : Traçabilité des changements
- **Alertes automatiques** : Notifications lors de changements d'état
- **Validation avancée** : Règles métier personnalisées

### 2. Nouvelles Fonctionnalités

- **Stock réservé** : Gestion des commandes en cours
- **Seuils dynamiques** : Calcul automatique des seuils
- **Prévisions** : Estimation des besoins futurs
- **Rapports** : Statistiques d'utilisation des stocks

## Conclusion

Cette amélioration rend la gestion des stocks plus intuitive et complète, permettant aux utilisateurs de gérer facilement tous les états possibles d'un produit, du stock non géré à la rupture en passant par les stocks disponibles.
