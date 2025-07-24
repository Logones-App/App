"use client";

import { useState, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useProductsRealtime } from "@/hooks/use-products-realtime";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import type {
  ProductWithStock,
  ProductStockJoin,
  CreateProductPayload,
  CreateProductStockPayload,
} from "@/lib/types/database-extensions";

// Types basés sur database.types.ts
type Product = Tables<"products">;
type ProductStock = Tables<"product_stocks">;
type ProductInsert = CreateProductPayload;
type ProductStockInsert = CreateProductStockPayload;

// Hook pour les produits en temps réel
function useProductsData(establishmentId: string, organizationId: string) {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    queryFn: async () => {
      const supabase = createClient();

      // Récupérer seulement les produits qui ont un stock dans cet établissement
      const { data, error } = await supabase
        .from("product_stocks")
        .select(
          `
          *,
          product:products(
            *
          )
        `,
        )
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .eq("product.deleted", false);

      if (error) throw error;

      // Transformer les données pour correspondre au type ProductWithStock
      return ((data as ProductStockJoin[]) || []).map((item) => ({
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
      })) as ProductWithStock[];
    },
  });

  return { products, isLoading, error };
}

// Fonction pour obtenir le statut du stock
const getStockStatus = (stock: ProductStock | null) => {
  if (!stock) return { status: "no-stock", label: "Pas de stock", icon: XCircle, color: "text-gray-500" };

  const { current_stock, min_stock, low_stock_threshold, critical_stock_threshold } = stock;

  // Stock non géré (-1)
  if (current_stock === -1) {
    return { status: "not-managed", label: "Stock non géré", icon: XCircle, color: "text-gray-500" };
  }

  // Rupture de stock (0)
  if (current_stock === 0) {
    return { status: "out-of-stock", label: "Rupture", icon: XCircle, color: "text-red-500" };
  }

  // Stock négatif (erreur)
  if (current_stock < 0) {
    return { status: "error", label: "Erreur", icon: XCircle, color: "text-red-600" };
  }

  // Stock critique
  if (critical_stock_threshold && current_stock <= critical_stock_threshold) {
    return { status: "critical", label: "Critique", icon: AlertTriangle, color: "text-red-600" };
  }

  // Stock faible
  if (low_stock_threshold && current_stock <= low_stock_threshold) {
    return { status: "low", label: "Faible", icon: AlertTriangle, color: "text-orange-500" };
  }

  // Stock minimum
  if (current_stock <= min_stock) {
    return { status: "min", label: "Minimum", icon: AlertTriangle, color: "text-yellow-500" };
  }

  // Stock OK
  return { status: "ok", label: "OK", icon: CheckCircle, color: "text-green-500" };
};

export function ProductsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { products, isLoading, error } = useProductsData(establishmentId, organizationId);

  // Hook realtime pour les produits
  const { forceRefresh } = useProductsRealtime(establishmentId, organizationId);

  // États pour les formulaires
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductsModal, setShowAddProductsModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // États pour les formulaires
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    price: 0,
    vat_rate: 20,
    is_available: true,
    current_stock: -1,
    min_stock: 0,
    max_stock: null as number | null,
    low_stock_threshold: null as number | null,
    critical_stock_threshold: null as number | null,
    unit: "pièce",
  });

  const [editProductForm, setEditProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    vat_rate: 20,
    is_available: true,
  });

  const [editStockForm, setEditStockForm] = useState({
    current_stock: 0,
    min_stock: 0,
    max_stock: null as number | null,
    low_stock_threshold: null as number | null,
    critical_stock_threshold: null as number | null,
    unit: "pièce",
  });

  // Requête pour récupérer tous les produits de l'organisation (pour l'association)
  const { data: allProducts } = useQuery({
    queryKey: ["organization-products", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (error) throw error;
      return data as Product[];
    },
  });

  // Mutation pour associer un produit à l'établissement
  const associateProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      console.log("🔍 Debug mutation - organizationId:", organizationId, "establishmentId:", establishmentId);

      if (!organizationId || !establishmentId) {
        throw new Error("organizationId ou establishmentId manquant");
      }

      const supabase = createClient();
      const insertData = {
        product_id: productId,
        establishment_id: establishmentId,
        organization_id: organizationId,
        current_stock: -1, // Pas de gestion de stock par défaut
        min_stock: 0, // Champ obligatoire
        max_stock: null,
        low_stock_threshold: null,
        critical_stock_threshold: null,
        reserved_stock: 0,
        unit: "pièce",
        deleted: false,
      } as ProductStockInsert;

      console.log("🔍 Data à insérer:", insertData);

      const { data, error } = await supabase.from("product_stocks").insert(insertData);

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log("✅ Insertion réussie:", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      setShowAddProductsModal(false);
      setSearchTerm("");
      setSelectedProductId("");
    },
  });

  // Mutation pour désassocier un produit de l'établissement
  const disassociateProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_stocks")
        .update({ deleted: true })
        .eq("product_id", productId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
    },
  });

  // Mutation pour ajouter un produit
  const addProductMutation = useMutation({
    mutationFn: async (payload: typeof addForm) => {
      const supabase = createClient();

      // Créer le produit
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: payload.name,
          description: payload.description,
          price: payload.price,
          vat_rate: payload.vat_rate,
          is_available: payload.is_available,
          organization_id: organizationId,
          deleted: false,
          user_id: (await supabase.auth.getUser()).data.user?.id || "",
        } as ProductInsert)
        .select()
        .single();

      if (productError) throw productError;

      // Créer le stock si nécessaire
      if (payload.current_stock >= 0) {
        const { error: stockError } = await supabase.from("product_stocks").insert({
          product_id: product.id,
          establishment_id: establishmentId,
          organization_id: organizationId,
          current_stock: payload.current_stock,
          min_stock: payload.min_stock,
          max_stock: payload.max_stock,
          low_stock_threshold: payload.low_stock_threshold,
          critical_stock_threshold: payload.critical_stock_threshold,
          unit: payload.unit,
          reserved_stock: 0,
        } as ProductStockInsert);

        if (stockError) throw stockError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      setShowAddForm(false);
      setAddForm({
        name: "",
        description: "",
        price: 0,
        vat_rate: 20,
        is_available: true,
        current_stock: -1,
        min_stock: 0,
        max_stock: null,
        low_stock_threshold: null,
        critical_stock_threshold: null,
        unit: "pièce",
      });
    },
  });

  // Mutation pour supprimer un produit
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ deleted: true }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
    },
  });

  // Mutation pour modifier un produit
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & typeof editProductForm) => {
      console.log("🔍 Debug updateProductMutation - id:", id, "payload:", payload);

      const supabase = createClient();

      // 1. Vérifier d'abord si le produit existe et est accessible
      const { data: existingProduct, error: selectError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (selectError) {
        console.error("❌ Erreur lors de la vérification du produit:", selectError);
        throw new Error(`Produit non trouvé ou inaccessible: ${selectError.message}`);
      }

      console.log("✅ Produit trouvé:", existingProduct);

      // 2. Tenter la mise à jour
      const { data, error, count } = await supabase.from("products").update(payload).eq("id", id).select();

      if (error) {
        console.error("❌ Erreur Supabase updateProduct:", error);
        throw error;
      }

      console.log("✅ Résultat de la mise à jour:", { data, count });

      if (!data || data.length === 0) {
        console.error("❌ Aucune ligne mise à jour - problème de permissions RLS?");
        throw new Error("Aucune modification effectuée - vérifiez les permissions");
      }

      console.log("✅ Produit mis à jour avec succès:", data[0]);
      return data[0];
    },
    onSuccess: (updated) => {
      console.log("✅ onSuccess updateProductMutation:", updated);
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      setEditingProductId(null);
      setErrorMsg(null);
    },
    onError: (error) => {
      console.error("❌ Erreur updateProductMutation:", error);
      setErrorMsg(`Erreur lors de la modification du produit: ${error.message}`);
    },
  });

  // Mutation pour modifier un stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, ...payload }: { productId: string } & typeof editStockForm) => {
      const supabase = createClient();

      // Vérifier si le stock existe
      const { data: existingStock } = await supabase
        .from("product_stocks")
        .select("id")
        .eq("product_id", productId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .single();

      if (existingStock) {
        // Mettre à jour le stock existant
        const { error } = await supabase.from("product_stocks").update(payload).eq("id", existingStock.id);
        if (error) throw error;
      } else {
        // Créer un nouveau stock
        const { error } = await supabase.from("product_stocks").insert({
          product_id: productId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          ...payload,
          reserved_stock: 0,
        } as ProductStockInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      setEditingStockId(null);
      setErrorMsg(null);
    },
  });

  // Handlers
  const handleAdd = () => {
    setShowAddForm(true);
  };

  const startEditProduct = (product: Product) => {
    console.log("🔍 Debug startEditProduct - product:", product);

    setEditingProductId(product.id);
    setErrorMsg(null); // Réinitialiser les erreurs

    setEditProductForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      vat_rate: product.vat_rate || 20,
      is_available: product.is_available ?? true,
    });

    console.log("✅ Formulaire d'édition initialisé:", {
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      vat_rate: product.vat_rate || 20,
      is_available: product.is_available ?? true,
    });
  };

  const startEditStock = (product: ProductWithStock) => {
    if (product.stock) {
      setEditingStockId(product.id);
      setEditStockForm({
        current_stock: product.stock.current_stock,
        min_stock: product.stock.min_stock,
        max_stock: product.stock.max_stock,
        low_stock_threshold: product.stock.low_stock_threshold,
        critical_stock_threshold: product.stock.critical_stock_threshold,
        unit: product.stock.unit,
      });
    }
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditingStockId(null);
    setErrorMsg(null);
  };

  const saveProductEdit = () => {
    console.log("🔍 Debug saveProductEdit - editingProductId:", editingProductId, "editProductForm:", editProductForm);

    if (!editingProductId) {
      console.error("❌ Pas d'ID de produit en cours d'édition");
      setErrorMsg("Erreur: Aucun produit sélectionné pour modification");
      return;
    }

    if (!editProductForm.name.trim()) {
      console.error("❌ Nom de produit vide");
      setErrorMsg("Le nom du produit est obligatoire");
      return;
    }

    if (editProductForm.price <= 0) {
      console.error("❌ Prix invalide:", editProductForm.price);
      setErrorMsg("Le prix doit être supérieur à 0");
      return;
    }

    console.log("✅ Validation OK, lancement de la mutation");
    updateProductMutation.mutate({ id: editingProductId, ...editProductForm });
  };

  const saveStockEdit = () => {
    if (editingStockId) {
      updateStockMutation.mutate({ productId: editingStockId, ...editStockForm });
    }
  };

  // Filtrer les produits disponibles pour l'association
  const availableProducts = allProducts?.filter((product) => !products?.some((p) => p.id === product.id)) || [];

  const filteredAvailableProducts = availableProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Erreur lors du chargement des produits: {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Produits</h2>
            <p className="text-muted-foreground">Gérez les produits et leurs stocks pour cet établissement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              Temps réel
            </div>
          </Badge>
          <Button variant="outline" size="sm" onClick={forceRefresh}>
            <Loader2 className="mr-1 h-3 w-3" />
            Actualiser
          </Button>
          <Dialog open={showAddProductsModal} onOpenChange={setShowAddProductsModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Associer un produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Associer un produit existant</DialogTitle>
                <DialogDescription>
                  Recherchez et associez un produit existant de votre organisation à cet établissement.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Rechercher un produit</Label>
                  <Input
                    id="search"
                    placeholder="Nom du produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {filteredAvailableProducts.map((product) => (
                    <div
                      key={product.id}
                      className="hover:bg-muted flex items-center justify-between rounded border p-2"
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-muted-foreground text-sm">{product.price.toFixed(2)} €</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => associateProductMutation.mutate(product.id)}
                        disabled={associateProductMutation.isPending || !organizationId || !establishmentId}
                      >
                        {associateProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Associer"}
                      </Button>
                    </div>
                  ))}
                  {filteredAvailableProducts.length === 0 && (
                    <div className="text-muted-foreground py-4 text-center">Aucun produit disponible</div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Chargement des produits...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products && products.length > 0 ? (
              products.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const StatusIcon = stockStatus.icon;

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-muted-foreground text-sm">{product.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.price.toFixed(2)} €</div>
                      <div className="text-muted-foreground text-sm">TVA {product.vat_rate}%</div>
                    </TableCell>
                    <TableCell>
                      {product.stock ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{product.stock.current_stock}</span> {product.stock.unit}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Min: {product.stock.min_stock} {product.stock.unit}
                            {product.stock.max_stock && ` | Max: ${product.stock.max_stock} ${product.stock.unit}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Pas de stock</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${stockStatus.color}`} />
                        <Badge variant="outline" className="text-xs">
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_available ? "default" : "secondary"}>
                        {product.is_available ? "Disponible" : "Indisponible"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditProduct(product)}
                          disabled={editingProductId === product.id}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Produit
                        </Button>
                        {product.stock && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditStock(product)}
                            disabled={editingStockId === product.id}
                          >
                            <Package className="mr-1 h-3 w-3" />
                            Stock
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disassociateProductMutation.mutate(product.id)}
                          disabled={disassociateProductMutation.isPending}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Retirer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Package className="text-muted-foreground h-12 w-12" />
                    <div>
                      <h3 className="text-lg font-medium">Aucun produit associé</h3>
                      <p className="text-muted-foreground text-sm">
                        Commencez par associer des produits existants ou créez de nouveaux produits.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAddProductsModal(true)}>
                        Associer un produit
                      </Button>
                      <Button onClick={handleAdd}>Créer un produit</Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal d'ajout de produit */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau produit</DialogTitle>
            <DialogDescription>
              Créez un nouveau produit pour votre organisation avec ses informations de base et de gestion des stocks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="price">Prix *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vat_rate">TVA (%)</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  value={addForm.vat_rate}
                  onChange={(e) => setAddForm({ ...addForm, vat_rate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={addForm.is_available}
                  onCheckedChange={(checked) => setAddForm({ ...addForm, is_available: checked })}
                />
                <Label htmlFor="is_available">Disponible</Label>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Gestion des stocks</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_stock">Stock initial</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={addForm.current_stock}
                    onChange={(e) => setAddForm({ ...addForm, current_stock: parseInt(e.target.value) || -1 })}
                    placeholder="-1 pour pas de stock"
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock">Stock minimum *</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={addForm.min_stock}
                    onChange={(e) => setAddForm({ ...addForm, min_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_stock">Stock maximum</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    value={addForm.max_stock || ""}
                    onChange={(e) =>
                      setAddForm({ ...addForm, max_stock: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unité</Label>
                  <Select value={addForm.unit} onValueChange={(value) => setAddForm({ ...addForm, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pièce">Pièce</SelectItem>
                      <SelectItem value="kg">Kilogramme</SelectItem>
                      <SelectItem value="l">Litre</SelectItem>
                      <SelectItem value="m">Mètre</SelectItem>
                      <SelectItem value="paquet">Paquet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="low_threshold">Seuil d'alerte</Label>
                  <Input
                    id="low_threshold"
                    type="number"
                    value={addForm.low_stock_threshold || ""}
                    onChange={(e) =>
                      setAddForm({ ...addForm, low_stock_threshold: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <Label htmlFor="critical_threshold">Seuil critique</Label>
                  <Input
                    id="critical_threshold"
                    type="number"
                    value={addForm.critical_stock_threshold || ""}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        critical_stock_threshold: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => addProductMutation.mutate(addForm)}
                disabled={addProductMutation.isPending || !addForm.name || addForm.price <= 0}
              >
                {addProductMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'édition de produit */}
      {editingProductId && (
        <Dialog open={!!editingProductId} onOpenChange={() => setEditingProductId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le produit</DialogTitle>
              <DialogDescription>
                Modifiez les informations de base du produit (nom, description, prix, TVA, disponibilité).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="edit-name">Nom</Label>
                <Input
                  id="edit-name"
                  value={editProductForm.name}
                  onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editProductForm.description}
                  onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Prix</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editProductForm.price}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vat">TVA (%)</Label>
                  <Input
                    id="edit-vat"
                    type="number"
                    value={editProductForm.vat_rate}
                    onChange={(e) =>
                      setEditProductForm({ ...editProductForm, vat_rate: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-available"
                  checked={editProductForm.is_available}
                  onCheckedChange={(checked) => setEditProductForm({ ...editProductForm, is_available: checked })}
                />
                <Label htmlFor="edit-available">Disponible</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelEdit}>
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("🔍 Test - État actuel:", {
                      editingProductId,
                      editProductForm,
                      updateProductMutation: {
                        isPending: updateProductMutation.isPending,
                        isError: updateProductMutation.isError,
                        error: updateProductMutation.error,
                      },
                    });
                  }}
                >
                  Debug
                </Button>
                <Button onClick={saveProductEdit} disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal d'édition de stock */}
      {editingStockId && (
        <Dialog open={!!editingStockId} onOpenChange={() => setEditingStockId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le stock</DialogTitle>
              <DialogDescription>
                Modifiez les paramètres de gestion des stocks pour ce produit dans cet établissement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-current-stock">Stock actuel</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-current-stock"
                        type="number"
                        min="-1"
                        value={editStockForm.current_stock}
                        onChange={(e) =>
                          setEditStockForm({ ...editStockForm, current_stock: parseInt(e.target.value) || 0 })
                        }
                        placeholder="0 ou plus"
                      />
                      {editStockForm.current_stock === -1 && (
                        <Badge variant="secondary" className="text-xs">
                          Stock non géré
                        </Badge>
                      )}
                      {editStockForm.current_stock === 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Rupture
                        </Badge>
                      )}
                      {editStockForm.current_stock > 0 && (
                        <Badge variant="default" className="text-xs">
                          En stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditStockForm({ ...editStockForm, current_stock: -1 })}
                        className="text-xs"
                      >
                        Stock non géré (-1)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditStockForm({ ...editStockForm, current_stock: 0 })}
                        className="text-xs"
                      >
                        Rupture (0)
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      -1 = Stock non géré, 0 = Rupture, &gt;0 = Stock disponible
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-min-stock">Stock minimum</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    min="0"
                    value={editStockForm.min_stock}
                    onChange={(e) => setEditStockForm({ ...editStockForm, min_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-max-stock">Stock maximum</Label>
                  <Input
                    id="edit-max-stock"
                    type="number"
                    value={editStockForm.max_stock || ""}
                    onChange={(e) =>
                      setEditStockForm({
                        ...editStockForm,
                        max_stock: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-unit">Unité</Label>
                  <Select
                    value={editStockForm.unit}
                    onValueChange={(value) => setEditStockForm({ ...editStockForm, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pièce">Pièce</SelectItem>
                      <SelectItem value="kg">Kilogramme</SelectItem>
                      <SelectItem value="l">Litre</SelectItem>
                      <SelectItem value="m">Mètre</SelectItem>
                      <SelectItem value="paquet">Paquet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-low-threshold">Seuil d'alerte</Label>
                  <Input
                    id="edit-low-threshold"
                    type="number"
                    value={editStockForm.low_stock_threshold || ""}
                    onChange={(e) =>
                      setEditStockForm({
                        ...editStockForm,
                        low_stock_threshold: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-critical-threshold">Seuil critique</Label>
                  <Input
                    id="edit-critical-threshold"
                    type="number"
                    value={editStockForm.critical_stock_threshold || ""}
                    onChange={(e) =>
                      setEditStockForm({
                        ...editStockForm,
                        critical_stock_threshold: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelEdit}>
                  Annuler
                </Button>
                <Button onClick={saveStockEdit} disabled={updateStockMutation.isPending}>
                  {updateStockMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
