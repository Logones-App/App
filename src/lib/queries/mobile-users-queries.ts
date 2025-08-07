import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

// Hook pour récupérer tous les mobile users d'un établissement
export function useEstablishmentMobileUsers(establishmentId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["mobile-users", "establishment", establishmentId],
    queryFn: async (): Promise<MobileUser[]> => {
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erreur lors de la récupération des utilisateurs mobile: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!establishmentId,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer un mobile user spécifique
export function useMobileUser(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["mobile-users", userId],
    queryFn: async (): Promise<MobileUser | null> => {
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("id", userId)
        .eq("deleted", false)
        .single();

      if (error) {
        throw new Error(`Erreur lors de la récupération de l'utilisateur mobile: ${error.message}`);
      }

      return data;
    },
    enabled: !!userId,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
