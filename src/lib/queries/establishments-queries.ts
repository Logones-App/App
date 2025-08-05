import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Establishment = Database["public"]["Tables"]["establishments"]["Row"];

// Query pour récupérer les établissements d'une organisation
export const useOrganizationEstablishments = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-establishments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });
};

// Query pour récupérer un établissement spécifique
export const useEstablishment = (establishmentId?: string) => {
  return useQuery({
    queryKey: ["establishment", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("id", establishmentId)
        .eq("deleted", false)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
};

// Query pour récupérer un établissement par slug
export const useEstablishmentBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["establishment-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("slug", slug)
        .eq("deleted", false)
        .eq("is_public", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};
