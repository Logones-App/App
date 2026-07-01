"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type RecipeEdge = { main_product_id: string; component_product_id: string };

/**
 * Arêtes du graphe des recettes d'un établissement (BOM : recette → ingrédient), hors self-composition.
 * Sert à parcourir l'arbre BOM (agrégation allergènes/origine, récursif).
 */
export function useEstablishmentRecipeEdges(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: ["recipe-edges", establishmentId, organizationId],
    enabled: !!establishmentId && !!organizationId,
    queryFn: async (): Promise<RecipeEdge[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_compositions")
        .select("main_product_id, component_product_id")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("composition_kind", "recipe")
        .eq("deleted", false);
      if (error) throw error;
      return (data ?? []).filter((e) => e.main_product_id !== e.component_product_id);
    },
  });
}
