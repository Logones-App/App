import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { realtimeService, type RealtimeSubscription } from "../../realtime-service";

export type ProductStock = Tables<"product_stocks">;
export type Product = Tables<"products">;

export interface ProductWithStock extends Product {
  stock: ProductStock | null;
}

export interface ProductsRealtimeEvent {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: "products" | "product_stocks";
  record: Product | ProductStock;
  oldRecord?: Product | ProductStock;
}

class ProductsRealtime {
  private subscriptions: RealtimeChannel[] = [];
  private eventHandlers: ((event: ProductsRealtimeEvent) => void)[] = [];

  /**
   * S'abonner aux changements des produits d'un établissement
   */
  subscribeToEstablishmentProducts(
    establishmentId: string,
    organizationId: string,
    onEvent?: (event: ProductsRealtimeEvent) => void,
  ) {
    const supabase = createClient();

    // S'abonner aux changements de la table product_stocks (sans filtre complexe)
    const productStocksSubscription = supabase
      .channel(`product_stocks_${establishmentId}_${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_stocks",
        },
        (payload) => {
          // Filtrer côté client pour cet établissement et organisation
          const record = payload.new ?? payload.old;
          if (
            record &&
            (record as ProductStock).establishment_id === establishmentId &&
            (record as ProductStock).organization_id === organizationId
          ) {
            const event: ProductsRealtimeEvent = {
              type: payload.eventType,
              table: "product_stocks",
              record: payload.new as ProductStock,
              oldRecord: payload.old as ProductStock,
            };

            console.log(
              "📡 Product stocks realtime event:",
              event.type,
              (record as ProductStock).id,
              (record as ProductStock).establishment_id,
              (record as ProductStock).organization_id,
            );
            this.notifyEventHandlers(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    // S'abonner aux changements de la table products (sans filtre complexe)
    const productsSubscription = supabase
      .channel(`products_${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          // Filtrer côté client pour cette organisation
          const record = payload.new ?? payload.old;
          if (record && (record as Product).organization_id === organizationId) {
            const event: ProductsRealtimeEvent = {
              type: payload.eventType,
              table: "products",
              record: payload.new as Product,
              oldRecord: payload.old as Product,
            };

            console.log(
              "📡 Products realtime event:",
              event.type,
              (record as Product).id,
              (record as Product).organization_id,
            );
            this.notifyEventHandlers(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(productStocksSubscription, productsSubscription);

    return () => {
      productStocksSubscription.unsubscribe();
      productsSubscription.unsubscribe();
    };
  }

  /**
   * Ajouter un gestionnaire d'événements global
   */
  addEventHandler(handler: (event: ProductsRealtimeEvent) => void) {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notifier tous les gestionnaires d'événements
   */
  private notifyEventHandlers(event: ProductsRealtimeEvent) {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("Erreur dans le gestionnaire d'événements products realtime:", error);
      }
    });
  }

  /**
   * Se désabonner de tous les abonnements
   */
  unsubscribe() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
    this.eventHandlers = [];
  }
}

// Instance singleton
export const productsRealtime = new ProductsRealtime();
