import { useEffect } from "react";

import { useRealtimeStore } from "@/lib/stores/realtime-store";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook pour écouter les changements des établissements
 */
export function useEstablishmentsRealtime() {
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
          console.log("📡 Establishments realtime event:", payload);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isConnected]);
}
