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

export type ProductionEvent = {
  id: string;
  created_at: string | null;
  quantity: number;
  unit_cost: number | null;
  needs_review: boolean;
};

/** Historique des lots fabriqués d'une préparation (mouvements `production` de sortie, quantité > 0). */
export function useProductionHistory(prepStockId: string | null, establishmentId: string) {
  return useQuery({
    queryKey: ["production-history", prepStockId, establishmentId],
    enabled: !!prepStockId && !!establishmentId,
    queryFn: async (): Promise<ProductionEvent[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, created_at, quantity, unit_cost, needs_review")
        .eq("product_stock_id", prepStockId as string)
        .eq("movement_type", "production")
        .gt("quantity", 0)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ProductionEvent[];
    },
  });
}

export type SelfStock = { id: string; current_stock: number; unit: string | null; inventory_tracked: boolean };

/** Fiche stock « propre » (self-composition) de chaque produit d'un lot — pour la production. */
export function useSelfProductStocks(productIds: string[], establishmentId: string) {
  const ids = [...productIds].sort();
  return useQuery({
    queryKey: ["self-product-stocks", ids.join(","), establishmentId],
    enabled: ids.length > 0 && !!establishmentId,
    queryFn: async (): Promise<Map<string, SelfStock>> => {
      const supabase = createClient();
      const { data: comps, error: cErr } = await supabase
        .from("product_compositions")
        .select("id, main_product_id, component_product_id")
        .in("main_product_id", ids)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (cErr) throw cErr;
      const selfComps = (comps ?? []).filter((c) => c.main_product_id === c.component_product_id);
      const compToProduct = new Map(selfComps.map((c) => [c.id, c.main_product_id]));
      if (selfComps.length === 0) return new Map();

      const { data: stocks, error: sErr } = await supabase
        .from("product_stocks")
        .select("id, product_composition_id, current_stock, unit, inventory_tracked")
        .in(
          "product_composition_id",
          selfComps.map((c) => c.id),
        )
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (sErr) throw sErr;

      const out = new Map<string, SelfStock>();
      for (const s of stocks ?? []) {
        const pid = compToProduct.get(s.product_composition_id);
        if (pid) {
          out.set(pid, {
            id: s.id,
            current_stock: s.current_stock,
            unit: s.unit,
            inventory_tracked: s.inventory_tracked ?? false,
          });
        }
      }
      return out;
    },
  });
}
