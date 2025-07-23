# 🚀 GUIDE DE MIGRATION DES TYPES

## 📋 Vue d'ensemble

Ce guide vous aide à migrer progressivement vers l'utilisation des types stricts dans l'application.

## 🎯 Objectifs

1. **Éliminer l'utilisation de `any`**
2. **Utiliser les types Supabase générés**
3. **Améliorer la sécurité de type**
4. **Faciliter la maintenance**

## 📁 Structure des Types

```
src/lib/types/
├── index.ts                    # Export centralisé
├── database-extensions.ts      # Types utilitaires
└── [autres fichiers de types]
```

## 🔧 Migration par Étapes

### Étape 1 : Importer les Types

#### Avant

```typescript
import type { Tables } from "@/lib/supabase/database.types";

type Product = Tables<"products">;
```

#### Après

```typescript
import type { Product, ProductWithStock, CreateProductPayload } from "@/lib/types";
```

### Étape 2 : Remplacer les Types `any`

#### Avant

```typescript
const products = (data || []).map((item: any) => ({
  ...item.product,
  stock: item,
}));
```

#### Après

```typescript
import type { ProductStockJoin } from "@/lib/types";

const products = ((data as ProductStockJoin[]) || []).map((item) => ({
  ...item.product,
  stock: {
    id: item.id,
    current_stock: item.current_stock,
    // ... autres propriétés
  },
}));
```

### Étape 3 : Typage des Mutations

#### Avant

```typescript
const addProductMutation = useMutation({
  mutationFn: async (payload: typeof addForm) => {
    // ...
  },
});
```

#### Après

```typescript
import type { CreateProductPayload } from "@/lib/types";

const addProductMutation = useMutation({
  mutationFn: async (payload: CreateProductPayload) => {
    // ...
  },
});
```

### Étape 4 : Typage des Événements

#### Avant

```typescript
const handleDragEnd = (event: any) => {
  // ...
};
```

#### Après

```typescript
import type { DragEndEvent } from "@dnd-kit/core";

const handleDragEnd = (event: DragEndEvent) => {
  // ...
};
```

## 📝 Exemples de Migration

### Exemple 1 : Composant de Produits

#### Avant

```typescript
"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";

type Product = Tables<"products">;
type ProductStock = Tables<"product_stocks">;

interface ProductWithStock extends Product {
  stock: ProductStock | null;
}

export function ProductsComponent() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);

  const handleData = (data: any) => {
    const productsWithStock = data.map((item: any) => ({
      ...item.product,
      stock: item,
    }));
    setProducts(productsWithStock);
  };
}
```

#### Après

```typescript
"use client";

import { useState } from "react";
import type { ProductWithStock, ProductStockJoin } from "@/lib/types";

export function ProductsComponent() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);

  const handleData = (data: ProductStockJoin[]) => {
    const productsWithStock = data.map((item) => ({
      ...item.product,
      stock: {
        id: item.id,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        max_stock: item.max_stock,
        low_stock_threshold: item.low_stock_threshold,
        critical_stock_threshold: item.critical_stock_threshold,
        unit: item.unit,
        reserved_stock: item.reserved_stock,
        establishment_id: item.establishment_id,
        organization_id: item.organization_id,
        product_id: item.product_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted: item.deleted,
        last_updated_by: item.last_updated_by,
      },
    }));
    setProducts(productsWithStock);
  };
}
```

### Exemple 2 : Hook Realtime

#### Avant

```typescript
import { useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";

type Product = Tables<"products">;

export function useProductsRealtime() {
  const handleEvent = (event: any) => {
    console.log("Event:", event.type, event.record);
  };

  useEffect(() => {
    // ...
  }, []);
}
```

#### Après

```typescript
import { useEffect } from "react";
import type { ProductsRealtimeEvent, Product } from "@/lib/types";

export function useProductsRealtime() {
  const handleEvent = (event: ProductsRealtimeEvent) => {
    console.log("Event:", event.type, event.record);
  };

  useEffect(() => {
    // ...
  }, []);
}
```

### Exemple 3 : Service API

#### Avant

```typescript
export class ProductService {
  async createProduct(data: any) {
    const response = await supabase.from("products").insert(data).select().single();

    return response.data;
  }
}
```

#### Après

```typescript
import type { CreateProductPayload, Product } from "@/lib/types";

export class ProductService {
  async createProduct(data: CreateProductPayload): Promise<Product> {
    const response = await supabase.from("products").insert(data).select().single();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  }
}
```

## 🛠️ Outils de Migration

### 1. Recherche des Types `any`

```bash
# Rechercher toutes les occurrences de `any`
grep -r ": any" src/
grep -r "any)" src/
grep -r "any[]" src/
```

### 2. Vérification TypeScript

```bash
# Vérifier les erreurs de type
npx tsc --noEmit

# Vérifier avec ESLint
npx eslint src/ --ext .ts,.tsx
```

### 3. Tests de Types

```typescript
// Créer des tests de types
import type { ProductWithStock } from "@/lib/types";

// Test de type (sera vérifié à la compilation)
const testProduct: ProductWithStock = {
  id: "test-id",
  name: "Test Product",
  price: 10.99,
  vat_rate: 20,
  is_available: true,
  organization_id: "org-id",
  user_id: "user-id",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  deleted: false,
  description: "Test description",
  stock: {
    id: "stock-id",
    product_id: "test-id",
    establishment_id: "est-id",
    organization_id: "org-id",
    current_stock: 10,
    min_stock: 5,
    max_stock: 100,
    low_stock_threshold: 10,
    critical_stock_threshold: 2,
    unit: "pièce",
    reserved_stock: 0,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    deleted: false,
    last_updated_by: null,
  },
};
```

## 📋 Checklist de Migration

### ✅ Priorité Haute

- [ ] Remplacer `any` dans les composants principaux
- [ ] Typage des mutations CRUD
- [ ] Typage des réponses Supabase
- [ ] Typage des événements realtime

### ✅ Priorité Moyenne

- [ ] Typage des hooks personnalisés
- [ ] Typage des services
- [ ] Typage des utilitaires
- [ ] Typage des composants UI

### ✅ Priorité Basse

- [ ] Typage des tests
- [ ] Typage des configurations
- [ ] Typage des métadonnées
- [ ] Documentation des types

## 🚨 Erreurs Courantes

### 1. Type Assertion Incorrecte

#### ❌ Incorrect

```typescript
const data = response.data as ProductWithStock[];
```

#### ✅ Correct

```typescript
const data = (response.data as ProductStockJoin[]).map(transformToProductWithStock);
```

### 2. Type Manquant pour les Props

#### ❌ Incorrect

```typescript
interface Props {
  data: any;
  onUpdate: any;
}
```

#### ✅ Correct

```typescript
interface Props {
  data: ProductWithStock[];
  onUpdate: (product: UpdateProductPayload) => void;
}
```

### 3. Type Manquant pour les États

#### ❌ Incorrect

```typescript
const [products, setProducts] = useState([]);
```

#### ✅ Correct

```typescript
const [products, setProducts] = useState<ProductWithStock[]>([]);
```

## 🎯 Bonnes Pratiques

### 1. Utiliser les Types Exports

```typescript
// ✅ Bon
import type { ProductWithStock } from "@/lib/types";

// ❌ Éviter
import type { Tables } from "@/lib/supabase/database.types";
type ProductWithStock = Tables<"products"> & { stock: Tables<"product_stocks"> | null };
```

### 2. Typage Strict des Fonctions

```typescript
// ✅ Bon
function transformProduct(data: ProductStockJoin): ProductWithStock {
  return {
    ...data.product,
    stock: data,
  };
}

// ❌ Éviter
function transformProduct(data: any): any {
  return {
    ...data.product,
    stock: data,
  };
}
```

### 3. Validation des Types

```typescript
// ✅ Bon
function isValidProduct(product: unknown): product is Product {
  return typeof product === "object" && product !== null && "id" in product && "name" in product && "price" in product;
}
```

## 📚 Ressources

- [Documentation TypeScript](https://www.typescriptlang.org/docs/)
- [Types Supabase](https://supabase.com/docs/reference/javascript/typescript-support)
- [React TypeScript](https://react-typescript-cheatsheet.netlify.app/)

---

_Guide créé le : ${new Date().toLocaleDateString('fr-FR')}_
