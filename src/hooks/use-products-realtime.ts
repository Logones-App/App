import { useEffect, useCallback } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { productsRealtime, type ProductsRealtimeEvent } from "@/lib/services/realtime/modules/products-realtime";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import type { ProductWithStock, ProductStockJoin } from "@/lib/types/database-extensions";

type Product = Tables<"products">;
type ProductStock = Tables<"product_stocks">;

export function useProductsRealtime(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();

  /**
   * Fonction pour rafraîchir les données des produits
   */
  const refreshProducts = useCallback(async () => {
    const supabase = createClient();

    try {
      // Récupérer les produits avec leurs stocks pour cet établissement
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
      const productsWithStock = ((data as ProductStockJoin[]) || []).map((item) => ({
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

      // Mettre à jour le cache TanStack Query
      queryClient.setQueryData(
        ["establishment-products-with-stocks", establishmentId, organizationId],
        productsWithStock,
      );

      console.log("🔄 Products realtime: données rafraîchies", productsWithStock.length, "produits");
    } catch (error) {
      console.error("❌ Erreur lors du rafraîchissement des produits:", error);
    }
  }, [establishmentId, organizationId, queryClient]);

  /**
   * Gestionnaire d'événements realtime
   */
  const handleRealtimeEvent = useCallback(
    (event: ProductsRealtimeEvent) => {
      console.log("📡 Products realtime event:", event.type, event.table, event.record?.id);

      // Rafraîchir les données après chaque événement
      refreshProducts();
    },
    [refreshProducts],
  );

  /**
   * S'abonner aux changements realtime
   */
  useEffect(() => {
    if (!establishmentId || !organizationId) return;

    console.log("🔌 Products realtime: abonnement pour", establishmentId, organizationId);

    // S'abonner aux changements
    const unsubscribe = productsRealtime.subscribeToEstablishmentProducts(
      establishmentId,
      organizationId,
      handleRealtimeEvent,
    );

    // Ajouter un gestionnaire d'événements global
    const removeEventHandler = productsRealtime.addEventHandler(handleRealtimeEvent);

    // Nettoyage
    return () => {
      console.log("🔌 Products realtime: désabonnement pour", establishmentId, organizationId);
      unsubscribe();
      removeEventHandler();
    };
  }, [establishmentId, organizationId, handleRealtimeEvent]);

  /**
   * Fonction pour forcer le rafraîchissement
   */
  const forceRefresh = useCallback(() => {
    refreshProducts();
  }, [refreshProducts]);

  return {
    forceRefresh,
    refreshProducts,
  };
}
