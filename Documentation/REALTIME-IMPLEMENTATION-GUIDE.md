# Guide d'Implémentation Realtime - Supabase + Next.js

## 📋 Vue d'ensemble

Ce guide explique comment implémenter le realtime Supabase sur une table, en se basant sur l'implémentation réussie de la table `messages`.

## 🎯 Objectif

Créer une page qui affiche les données d'une table en temps réel avec :

- ✅ Chargement initial des données
- ✅ Mise à jour en temps réel (INSERT, UPDATE, DELETE)
- ✅ Interface utilisateur réactive
- ✅ Gestion des erreurs et états de connexion

## 📁 Structure des fichiers

```
src/app/[locale]/(dashboard)/admin/[table-name]/
├── page.tsx                    # Page principale avec realtime
└── _components/                # Composants spécifiques (optionnel)
```

## 🔧 Étapes d'implémentation

### 1. Configuration Supabase (Base de données)

#### A. Activer le realtime sur la table

```sql
-- Activer le realtime sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE [table_name];

-- Vérifier que la table est dans la publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

#### B. Configurer les politiques RLS (Row Level Security)

```sql
-- Exemple pour une table 'products'
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  organization_id UUID REFERENCES organizations(id),
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Politiques RLS pour system_admin (accès complet)
CREATE POLICY "system_admin_all_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'system_admin'
    )
  );

-- Politiques RLS pour org_admin (accès limité à son organisation)
CREATE POLICY "org_admin_own_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'org_admin'
      AND products.organization_id = (
        SELECT organization_id FROM users_organizations
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  );
```

### 2. Créer la page avec realtime

#### A. Structure de base de la page

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Définir le type de votre table
type YourTable = Database["public"]["Tables"]["your_table"]["Row"];

export default function YourTablePage() {
  const [data, setData] = useState<YourTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // ... suite dans les sections suivantes
}
```

#### B. Fonction de chargement des données

```typescript
// Charger les données initiales
const loadData = useCallback(async () => {
  try {
    console.log("🔄 Chargement des données...");
    const { data, error } = await supabase.from("your_table").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erreur lors du chargement:", error);
      setError(error.message);
      return;
    }

    console.log("✅ Données chargées:", data?.length || 0);
    setData(data || []);
  } catch (err) {
    console.error("❌ Erreur inattendue:", err);
    setError("Erreur lors du chargement des données");
  } finally {
    setLoading(false);
  }
}, [supabase]);
```

#### C. Configuration du realtime

```typescript
// Initialiser le realtime
useEffect(() => {
  console.log("🔄 Initialisation du realtime pour [table_name]...");

  // Charger les données initiales
  loadData();

  // Configurer l'abonnement realtime
  const channel = supabase
    .channel("your_table_realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "your_table",
      },
      (payload: RealtimePostgresChangesPayload<YourTable>) => {
        console.log("🔔 Événement realtime reçu:", payload);

        if (payload.eventType === "INSERT") {
          console.log("➕ Nouvelle entrée:", payload.new);
          setData((prev) => [payload.new as YourTable, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          console.log("✏️ Entrée modifiée:", payload.new);
          setData((prev) => prev.map((item) => (item.id === payload.new.id ? (payload.new as YourTable) : item)));
        } else if (payload.eventType === "DELETE") {
          console.log("🗑️ Entrée supprimée:", payload.old);
          setData((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      },
    )
    .subscribe((status) => {
      console.log("📡 Statut de l'abonnement [table_name]:", status);
      setIsConnected(status === "SUBSCRIBED");
    });

  channelRef.current = channel;

  return () => {
    console.log("🔌 Déconnexion du realtime [table_name]");
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [loadData]); // Dépendance stable
```

#### D. Fonctions CRUD

```typescript
// Fonction pour ajouter une entrée
const addItem = async () => {
  try {
    const newItem = {
      name: `Item test créé à ${new Date().toLocaleTimeString()}`,
      description: "Description de test",
      price: Math.random() * 100,
      organization_id: null, // ou l'ID d'une organisation
    };

    const { data, error } = await supabase.from("your_table").insert(newItem).select().single();

    if (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      setError(error.message);
    } else {
      console.log("✅ Item ajouté:", data);
    }
  } catch (err) {
    console.error("❌ Erreur inattendue:", err);
    setError("Erreur lors de l'ajout de l'item");
  }
};

// Fonction pour supprimer une entrée
const deleteItem = async (id: string) => {
  try {
    const { error } = await supabase.from("your_table").delete().eq("id", id);

    if (error) {
      console.error("❌ Erreur lors de la suppression:", error);
      setError(error.message);
    } else {
      console.log("✅ Item supprimé:", id);
    }
  } catch (err) {
    console.error("❌ Erreur inattendue:", err);
    setError("Erreur lors de la suppression de l'item");
  }
};
```

#### E. Interface utilisateur

```typescript
if (loading) {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>[Nom de votre table]</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Chargement...</div>
        </CardContent>
      </Card>
    </div>
  );
}

return (
  <div className="container mx-auto p-6">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>[Nom de votre table] Realtime</CardTitle>
          <div className="flex gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "🟢 Connecté" : "🔴 Déconnecté"}
            </Badge>
            <Button onClick={addItem} size="sm">
              Ajouter un item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center text-gray-500">
              Aucune donnée trouvée
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={item.deleted ? "destructive" : "default"}>
                        {item.deleted ? "Supprimé" : "Actif"}
                      </Badge>
                      {item.organization_id && (
                        <Badge variant="outline">
                          Org: {item.organization_id.slice(0, 8)}...
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600">{item.description}</p>
                    <div className="text-sm text-gray-500">
                      Créé le: {new Date(item.created_at).toLocaleString()}
                      {item.updated_at && item.updated_at !== item.created_at && (
                        <span className="ml-4">
                          Modifié le: {new Date(item.updated_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {!item.deleted && (
                    <Button
                      onClick={() => deleteItem(item.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);
```

## 🔄 Exemple complet : Table "products"

Voici un exemple complet pour une table `products` :

### A. Script SQL pour la table

```sql
-- Créer la table products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  organization_id UUID REFERENCES organizations(id),
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer le realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Politiques RLS
CREATE POLICY "system_admin_all_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'system_admin'
    )
  );

CREATE POLICY "org_admin_own_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'org_admin'
      AND products.organization_id = (
        SELECT organization_id FROM users_organizations
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  );
```

### B. Page products avec realtime

```typescript
// src/app/[locale]/(dashboard)/admin/products/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Charger les produits initiaux
  const loadProducts = useCallback(async () => {
    try {
      console.log("🔄 Chargement des produits...");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur lors du chargement:", error);
        setError(error.message);
        return;
      }

      console.log("✅ Produits chargés:", data?.length || 0);
      setProducts(data || []);
    } catch (err) {
      console.error("❌ Erreur inattendue:", err);
      setError("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initialiser le realtime
  useEffect(() => {
    console.log("🔄 Initialisation du realtime pour les produits...");

    loadProducts();

    const channel = supabase
      .channel("products_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload: RealtimePostgresChangesPayload<Product>) => {
          console.log("🔔 Événement realtime reçu:", payload);

          if (payload.eventType === "INSERT") {
            console.log("➕ Nouveau produit:", payload.new);
            setProducts((prev) => [payload.new as Product, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            console.log("✏️ Produit modifié:", payload.new);
            setProducts((prev) =>
              prev.map((product) =>
                product.id === payload.new.id ? (payload.new as Product) : product
              )
            );
          } else if (payload.eventType === "DELETE") {
            console.log("🗑️ Produit supprimé:", payload.old);
            setProducts((prev) => prev.filter((product) => product.id !== payload.old.id));
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Statut de l'abonnement products:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      console.log("🔌 Déconnexion du realtime products");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadProducts]);

  // Fonction pour ajouter un produit de test
  const addTestProduct = async () => {
    try {
      const testProduct = {
        name: `Produit test ${Date.now()}`,
        description: "Description de test",
        price: Math.random() * 100,
        organization_id: null,
      };

      const { data, error } = await supabase
        .from("products")
        .insert(testProduct)
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur lors de l'ajout:", error);
        setError(error.message);
      } else {
        console.log("✅ Produit ajouté:", data);
      }
    } catch (err) {
      console.error("❌ Erreur inattendue:", err);
      setError("Erreur lors de l'ajout du produit");
    }
  };

  // Fonction pour supprimer un produit
  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("❌ Erreur lors de la suppression:", error);
        setError(error.message);
      } else {
        console.log("✅ Produit supprimé:", id);
      }
    } catch (err) {
      console.error("❌ Erreur inattendue:", err);
      setError("Erreur lors de la suppression du produit");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">Chargement...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Produits Realtime</CardTitle>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "🟢 Connecté" : "🔴 Déconnecté"}
              </Badge>
              <Button onClick={addTestProduct} size="sm">
                Ajouter un produit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center text-gray-500">
                Aucun produit trouvé
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="rounded-lg border p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={product.deleted ? "destructive" : "default"}>
                          {product.deleted ? "Supprimé" : "Actif"}
                        </Badge>
                        {product.organization_id && (
                          <Badge variant="outline">
                            Org: {product.organization_id.slice(0, 8)}...
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-gray-600">{product.description}</p>
                      <p className="text-sm font-medium">
                        Prix: {product.price}€
                      </p>
                      <div className="text-sm text-gray-500">
                        Créé le: {new Date(product.created_at).toLocaleString()}
                        {product.updated_at && product.updated_at !== product.created_at && (
                          <span className="ml-4">
                            Modifié le: {new Date(product.updated_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {!product.deleted && (
                      <Button
                        onClick={() => deleteProduct(product.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🚀 Points clés pour réussir

### 1. **Gestion des dépendances**

- Utilisez `useCallback` pour stabiliser les fonctions
- Évitez les dépendances circulaires dans les `useEffect`
- Utilisez `useRef` pour gérer les canaux realtime

### 2. **Gestion des erreurs**

- Toujours gérer les erreurs Supabase
- Afficher les messages d'erreur à l'utilisateur
- Logger les erreurs pour le débogage

### 3. **Performance**

- Limitez le nombre d'éléments affichés si nécessaire
- Utilisez des clés uniques pour les listes
- Évitez les re-renders inutiles

### 4. **Sécurité**

- Configurez correctement les politiques RLS
- Vérifiez les permissions utilisateur
- Validez les données côté client et serveur

## 🔧 Dépannage

### Problème : Realtime ne fonctionne pas

1. Vérifiez que la table est dans la publication `supabase_realtime`
2. Vérifiez les politiques RLS
3. Vérifiez les logs de la console

### Problème : Boucle infinie

1. Vérifiez les dépendances des `useEffect`
2. Utilisez `useCallback` pour stabiliser les fonctions
3. Évitez les dépendances circulaires

### Problème : Erreurs 403

1. Vérifiez les politiques RLS
2. Vérifiez le rôle de l'utilisateur
3. Testez avec un utilisateur `system_admin`

## 📝 Checklist pour une nouvelle table

- [ ] Créer la table avec les colonnes nécessaires
- [ ] Activer le realtime sur la table
- [ ] Configurer les politiques RLS
- [ ] Créer la page avec realtime
- [ ] Tester les opérations CRUD
- [ ] Tester le realtime en temps réel
- [ ] Gérer les erreurs et états de chargement
- [ ] Optimiser les performances si nécessaire

---

**Ce guide vous permet de reproduire facilement l'implémentation realtime sur n'importe quelle table !** 🎉
