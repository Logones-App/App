"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/**
 * Calcule le coût FIFO par produit pour une liste d'ingrédients.
 *
 * Source de vérité unique : `stock_movements.remaining_quantity` des lots d'achat,
 * maintenu par le trigger FIFO (mêmes données que la valorisation de stock).
 * Le coût retourné est la moyenne pondérée des lots encore en stock :
 *   Σ(remaining_quantity × unit_cost) / Σ(remaining_quantity)
 *
 * Retourne une Map<productId, unitCost> en unité de stock (portionUnit).
 * Un produit sans lot FIFO actif est absent de la map → le composant peut
 * utiliser le dernier prix connu en fallback.
 */
export function useComponentFifoCosts(componentProductIds: string[], organizationId: string, establishmentId: string) {
  return useQuery({
    queryKey: ["component-fifo-costs", componentProductIds.sort().join(","), organizationId, establishmentId],
    queryFn: async () => {
      if (componentProductIds.length === 0) return new Map<string, number>();
      const supabase = createClient();

      // Lots d'achat encore en stock (remaining_quantity > 0), avec leur coût FIFO réel.
      const { data: lots, error } = await supabase
        .from("stock_movements")
        .select("product_id, remaining_quantity, unit_cost")
        .in("product_id", componentProductIds)
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .gt("remaining_quantity", 0)
        .not("unit_cost", "is", null)
        .eq("deleted", false);
      if (error) throw error;

      const acc = new Map<string, { val: number; qty: number }>();
      for (const lot of lots ?? []) {
        const rem = lot.remaining_quantity ?? 0;
        const cost = lot.unit_cost;
        if (rem <= 0 || cost == null) continue;
        const entry = acc.get(lot.product_id) ?? { val: 0, qty: 0 };
        entry.val += rem * cost;
        entry.qty += rem;
        acc.set(lot.product_id, entry);
      }

      const fifoMap = new Map<string, number>();
      for (const [productId, { val, qty }] of acc) {
        if (qty > 0) fifoMap.set(productId, Math.round((val / qty) * 10000) / 10000);
      }
      return fifoMap;
    },
    enabled: componentProductIds.length > 0 && !!organizationId && !!establishmentId,
  });
}
