import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];
type CreateDevicePayload = Database["public"]["Tables"]["devices"]["Insert"];
type UpdateDevicePayload = Database["public"]["Tables"]["devices"]["Update"];

// Hook pour créer un device
export function useCreateDevice() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDevicePayload): Promise<Device> => {
      const { data, error } = await supabase.from("devices").insert(payload).select().single();

      if (error) {
        throw new Error(`Erreur lors de la création du device: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["devices", "establishment", data.establishment_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["devices", "all"],
      });
    },
  });
}

// Hook pour mettre à jour un device
export function useUpdateDevice() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateDevicePayload }): Promise<Device> => {
      const { data, error } = await supabase.from("devices").update(updates).eq("id", id).select().single();

      if (error) {
        throw new Error(`Erreur lors de la mise à jour du device: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["devices", "establishment", data.establishment_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["devices", "all"],
      });
    },
  });
}

// Hook pour supprimer un device
export function useDeleteDevice() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("devices").update({ deleted: true }).eq("id", id);

      if (error) {
        throw new Error(`Erreur lors de la suppression du device: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["devices"],
      });
    },
  });
}
