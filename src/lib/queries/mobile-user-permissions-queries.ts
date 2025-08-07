import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];

// Hook principal pour récupérer les permissions d'un utilisateur mobile
export function useMobileUserPermissions(mobileUserId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["mobile-user-permissions", mobileUserId],
    queryFn: async (): Promise<MobileUserPermission[]> => {
      const { data, error } = await supabase
        .from("mobile_user_permissions")
        .select("*")
        .eq("mobile_user_id", mobileUserId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erreur lors de la récupération des permissions: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!mobileUserId,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer toutes les permissions d'un établissement
export function useEstablishmentMobileUserPermissions(establishmentId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["mobile-user-permissions", "establishment", establishmentId],
    queryFn: async (): Promise<MobileUserPermission[]> => {
      const { data, error } = await supabase
        .from("mobile_user_permissions")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erreur lors de la récupération des permissions: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!establishmentId,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer une permission spécifique
export function useMobileUserPermission(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["mobile-user-permissions", id],
    queryFn: async (): Promise<MobileUserPermission | null> => {
      const { data, error } = await supabase
        .from("mobile_user_permissions")
        .select("*")
        .eq("id", id)
        .eq("deleted", false)
        .single();

      if (error) {
        throw new Error(`Erreur lors de la récupération de la permission: ${error.message}`);
      }

      return data;
    },
    enabled: !!id,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
