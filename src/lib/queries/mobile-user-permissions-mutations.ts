import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];
type CreateMobileUserPermissionPayload = Database["public"]["Tables"]["mobile_user_permissions"]["Insert"];
type UpdateMobileUserPermissionPayload = Database["public"]["Tables"]["mobile_user_permissions"]["Update"];

// Hook pour créer une permission
export function useCreateMobileUserPermission() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMobileUserPermissionPayload): Promise<MobileUserPermission> => {
      const { data, error } = await supabase.from("mobile_user_permissions").insert(payload).select().single();

      if (error) {
        throw new Error(`Erreur lors de la création de la permission: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["mobile-user-permissions", data.mobile_user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["mobile-user-permissions", "establishment", data.establishment_id],
      });
    },
  });
}

// Hook pour mettre à jour une permission
export function useUpdateMobileUserPermission() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateMobileUserPermissionPayload;
    }): Promise<MobileUserPermission> => {
      const { data, error } = await supabase
        .from("mobile_user_permissions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur lors de la mise à jour de la permission: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["mobile-user-permissions", data.mobile_user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["mobile-user-permissions", "establishment", data.establishment_id],
      });
    },
  });
}

// Hook pour supprimer une permission
export function useDeleteMobileUserPermission() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("mobile_user_permissions").update({ deleted: true }).eq("id", id);

      if (error) {
        throw new Error(`Erreur lors de la suppression de la permission: ${error.message}`);
      }
    },
    onSuccess: (_, variables) => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({
        queryKey: ["mobile-user-permissions"],
      });
    },
  });
}

// Hook pour créer plusieurs permissions en batch
export function useCreateMobileUserPermissionsBatch() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: CreateMobileUserPermissionPayload[]): Promise<MobileUserPermission[]> => {
      const { data, error } = await supabase.from("mobile_user_permissions").insert(payloads).select();

      if (error) {
        throw new Error(`Erreur lors de la création des permissions: ${error.message}`);
      }

      return data || [];
    },
    onSuccess: (data) => {
      // Invalider le cache pour forcer le rechargement
      if (data.length > 0) {
        const mobileUserId = data[0].mobile_user_id;
        const establishmentId = data[0].establishment_id;

        queryClient.invalidateQueries({
          queryKey: ["mobile-user-permissions", mobileUserId],
        });
        queryClient.invalidateQueries({
          queryKey: ["mobile-user-permissions", "establishment", establishmentId],
        });
      }
    },
  });
}
