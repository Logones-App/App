"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type EstablishmentModule = Database["public"]["Tables"]["establishment_modules"]["Row"];

const QK = "establishment-modules";

export function useEstablishmentModules(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QK, establishmentId, organizationId],
    queryFn: async (): Promise<EstablishmentModule[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishment_modules")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

export function useToggleEstablishmentModule(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
      const supabase = createClient();
      // Upsert grâce à la contrainte unique (establishment_id, module)
      const { error } = await supabase
        .from("establishment_modules")
        .upsert(
          { establishment_id: establishmentId, organization_id: organizationId, module, enabled, deleted: false },
          { onConflict: "establishment_id,module" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK, establishmentId, organizationId] });
    },
  });
}

// Tous les establishment_modules d'une organisation (pour la page admin)
export function useAllEstablishmentModulesByOrg(organizationId: string) {
  return useQuery({
    queryKey: [QK, "org", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishment_modules")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
  });
}

// Mutation sans establishment en paramètre de hook (pour la page admin multi-établissements)
export function useUpsertEstablishmentModule(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { establishment_id: string; module: string; enabled: boolean; seats: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("establishment_modules")
        .upsert(
          { organization_id: organizationId, deleted: false, ...payload },
          { onConflict: "establishment_id,module" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK, "org", organizationId] });
    },
  });
}

export function useUpdateEstablishmentModuleSeats(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module, seats }: { module: string; seats: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("establishment_modules")
        .update({ seats })
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("module", module);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK, establishmentId, organizationId] });
    },
  });
}
