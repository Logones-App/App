import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

// Hook pour récupérer tous les devices d'un établissement
export function useEstablishmentDevices(establishmentId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["devices", "establishment", establishmentId],
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erreur lors de la récupération des devices: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!establishmentId,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer un device spécifique
export function useDevice(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["devices", id],
    queryFn: async (): Promise<Device | null> => {
      const { data, error } = await supabase.from("devices").select("*").eq("id", id).eq("deleted", false).single();

      if (error) {
        throw new Error(`Erreur lors de la récupération du device: ${error.message}`);
      }

      return data;
    },
    enabled: !!id,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer tous les devices (Admin)
export function useAllDevices() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["devices", "all"],
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erreur lors de la récupération des devices: ${error.message}`);
      }

      return data || [];
    },
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
