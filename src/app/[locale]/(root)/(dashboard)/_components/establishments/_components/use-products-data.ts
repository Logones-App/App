"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEstablishmentProductsWithStocks } from "@/lib/queries/establishments-related-queries";
import type { Tables } from "@/lib/supabase/database.types";
import type { CreateProductPayload, CreateProductStockPayload } from "@/lib/types/database-extensions";

export type Product = Tables<"products">;
export type ProductStock = Tables<"product_stocks">;
export type ProductInsert = CreateProductPayload;
export type ProductStockInsert = CreateProductStockPayload;

export function useProductsData(establishmentId: string, organizationId: string) {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    queryFn: () => fetchEstablishmentProductsWithStocks(establishmentId, organizationId),
  });

  return { products, isLoading, error };
}
