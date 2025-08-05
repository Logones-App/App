import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface UseEstablishmentOrganizationProps {
  establishmentId: string;
  enabled?: boolean;
}

interface UseEstablishmentOrganizationReturn {
  establishment: Establishment | null;
  organizationId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useEstablishmentOrganization({
  establishmentId,
  enabled = true,
}: UseEstablishmentOrganizationProps): UseEstablishmentOrganizationReturn {
  const {
    data: establishment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["establishment", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("id", establishmentId)
        .eq("deleted", false)
        .single();

      if (error) throw error;
      return data as Establishment;
    },
    enabled: enabled && !!establishmentId,
  });

  return {
    establishment: establishment ?? null,
    organizationId: establishment?.organization_id ?? null,
    isLoading,
    error: error ? new Error(error.message) : null,
  };
}
