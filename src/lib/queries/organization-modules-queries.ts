"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type OrganizationModule = Database["public"]["Tables"]["organization_modules"]["Row"];

const QK = "organization-modules";

export function useOrganizationModules(organizationId: string) {
  return useQuery({
    queryKey: [QK, organizationId],
    queryFn: async (): Promise<OrganizationModule[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useUpsertOrganizationModule(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      module: string;
      enabled: boolean;
      seats: number;
      max_establishments: number | null;
      max_concurrent_devices: number | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("organization_modules")
        .upsert(
          { organization_id: organizationId, deleted: false, ...payload },
          { onConflict: "organization_id,module" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK, organizationId] });
    },
  });
}
