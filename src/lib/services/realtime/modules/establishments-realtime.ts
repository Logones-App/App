import { createClient } from "@/lib/supabase/client";
import { useRealtimeStore } from "@/lib/stores/realtime-store";
import { useEffect } from "react";

export class EstablishmentsRealtimeModule {
  /**
   * Hook pour écouter les changements des établissements
   */
  useEstablishmentsRealtime() {
    const { isConnected } = useRealtimeStore();

    useEffect(() => {
      if (!isConnected) {
        return;
      }

      const supabase = createClient();
      const channel = supabase.channel("establishments-realtime");

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishments",
          },
          (payload) => {
            // Gérer les changements d'établissements
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [isConnected]);
  }
}

// Export d'une instance par défaut
export const establishmentsRealtime = new EstablishmentsRealtimeModule();

// Export du hook pour compatibilité
export const useEstablishmentsRealtime = () => {
  establishmentsRealtime.useEstablishmentsRealtime();
}; 