import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

export const OPTION_GROUPS_QUERY_KEY = "establishment-option-groups";
export const PRODUCT_OPTION_ASSIGNMENTS_QUERY_KEY = "product-option-group-assignments";

export type OptionGroupWithValues = Tables<"product_option_groups"> & {
  values: Tables<"product_option_group_values">[];
};

export type ProductOptionAssignment = Tables<"product_option_group_products"> & {
  group: OptionGroupWithValues | null;
};

export function useEstablishmentOptionGroups(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [OPTION_GROUPS_QUERY_KEY, establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_option_groups")
        .select("*, values:product_option_group_values(*)")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((g) => ({
        ...g,
        values: (g.values as Tables<"product_option_group_values">[]).filter((v) => !v.deleted),
      })) as OptionGroupWithValues[];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

export function useProductOptionAssignments(productId: string) {
  return useQuery({
    queryKey: [PRODUCT_OPTION_ASSIGNMENTS_QUERY_KEY, productId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_option_group_products")
        .select("*, group:product_option_groups(*, values:product_option_group_values(*))")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((a) => ({
        ...a,
        group: a.group
          ? {
              ...(a.group as Tables<"product_option_groups">),
              values: ((a.group as unknown as { values: Tables<"product_option_group_values">[] }).values ?? []).filter(
                (v) => !v.deleted,
              ),
            }
          : null,
      })) as ProductOptionAssignment[];
    },
    enabled: !!productId,
  });
}
