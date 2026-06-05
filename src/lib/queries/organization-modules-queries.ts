"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type OrganizationModule = Database["public"]["Tables"]["organization_modules"]["Row"];

export function useOrganizationModules(organizationId: string) {
  return useQuery({
    queryKey: ["organization-modules", organizationId],
    queryFn: async (): Promise<OrganizationModule[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
  });
}
