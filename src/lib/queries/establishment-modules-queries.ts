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
      const { data: existing } = await supabase
        .from("establishment_modules")
        .select("id")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("module", module)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("establishment_modules")
          .update({ enabled, deleted: false })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("establishment_modules")
          .insert({ establishment_id: establishmentId, organization_id: organizationId, module, enabled });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK, establishmentId, organizationId] });
    },
  });
}

export function useSetActiveDevice(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module, deviceId }: { module: string; deviceId: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("establishment_modules")
        .update({ active_device_id: deviceId })
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
