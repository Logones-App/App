"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { CreateProductPayload } from "@/lib/types/database-extensions";

import type { Product, ProductStock } from "./_components";

// Hook pour les mutations des produits
export function useProductsMutations(establishmentId: string) {
  const queryClient = useQueryClient();

  // Mutation pour ajouter un produit
  const addProductMutation = useMutation({
    mutationFn: async (productData: CreateProductPayload) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").insert(productData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
    },
  });

  // Mutation pour mettre à jour un produit
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
    },
  });

  // Mutation pour supprimer un produit
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
    },
  });

  // Mutation pour mettre à jour un stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductStock> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_stocks").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
    },
  });

  return {
    addProductMutation,
    updateProductMutation,
    deleteProductMutation,
    updateStockMutation,
  };
}
