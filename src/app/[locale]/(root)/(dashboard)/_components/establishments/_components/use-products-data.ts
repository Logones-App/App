"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  ProductWithStock,
  ProductStockJoin,
  CreateProductPayload,
  CreateProductStockPayload,
} from "@/lib/types/database-extensions";

// Types basés sur database.types.ts
export type Product = Tables<"products">;
export type ProductStock = Tables<"product_stocks">;
export type ProductInsert = CreateProductPayload;
export type ProductStockInsert = CreateProductStockPayload;

// Hook pour les produits en temps réel
export function useProductsData(establishmentId: string, organizationId: string) {
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