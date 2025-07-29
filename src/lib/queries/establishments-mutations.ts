import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Establishment = Database["public"]["Tables"]["establishments"]["Row"];
type EstablishmentInsert = Database["public"]["Tables"]["establishments"]["Insert"];
type EstablishmentUpdate = Database["public"]["Tables"]["establishments"]["Update"];

// Mutation pour créer un établissement
export const useCreateEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishment: EstablishmentInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("establishments").insert(establishment).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées
      queryClient.invalidateQueries({
        queryKey: ["organization-establishments", data.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["establishment", data.id],
      });
    },
  });
};

// Mutation pour mettre à jour un établissement
export const useUpdateEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
    } & Partial<EstablishmentUpdate>) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("establishments").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées
      queryClient.invalidateQueries({
        queryKey: ["organization-establishments", data.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["establishment", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["establishment-by-slug", data.slug],
      });
    },
  });
};

// Mutation pour supprimer un établissement (logical delete)
export const useDeleteEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishmentId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("establishments").update({ deleted: true }).eq("id", establishmentId);

      if (error) throw error;
      return establishmentId;
    },
    onSuccess: (establishmentId) => {
      // Invalider les queries liées
      queryClient.invalidateQueries({
        queryKey: ["organization-establishments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["establishment", establishmentId],
      });
    },
  });
};
