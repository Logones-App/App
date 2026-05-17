import { useEffect, useCallback } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { fetchEstablishmentProductsWithStocks } from "@/lib/queries/establishments-related-queries";
import { productsRealtime, type ProductsRealtimeEvent } from "@/lib/services/realtime/modules/products-realtime";

export function useProductsRealtime(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();

  /**
   * Fonction pour rafraîchir les données des produits
   */
  const refreshProducts = useCallback(async () => {
    try {
      const productsWithStock = await fetchEstablishmentProductsWithStocks(establishmentId, organizationId);

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
