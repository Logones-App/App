"use client";

import { useQuery } from "@tanstack/react-query";

import type { CompLine } from "@/lib/recipe-cost";
import { createClient } from "@/lib/supabase/client";

/**
 * Toutes les lignes de composition recette (BOM) d'un établissement, AVEC quantités —
 * nécessaire au coût récursif (une recette peut être un composant d'une autre).
 */
export function useEstablishmentRecipeCompositions(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: ["recipe-compositions-cost", establishmentId, organizationId],
    enabled: !!establishmentId && !!organizationId,
    queryFn: async (): Promise<CompLine[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_compositions")
        .select("main_product_id, component_product_id, default_quantity, quantity_unit, conversion_factor")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("composition_kind", "recipe")
        .eq("deleted", false);
      if (error) throw error;
      return (data ?? []).filter((e) => e.main_product_id !== e.component_product_id) as CompLine[];
    },
  });
}
