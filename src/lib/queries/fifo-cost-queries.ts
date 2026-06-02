"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

function computeFifoCost(currentStock: number, batches: { quantity: number; unit_cost: number }[]): number | null {
  if (batches.length === 0 || currentStock <= 0) return null;
  let remaining = currentStock;
  let totalCost = 0;
  let totalQty = 0;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    totalCost += take * batch.unit_cost;
    totalQty += take;
    remaining -= take;
  }
  return totalQty > 0 ? Math.round((totalCost / totalQty) * 10000) / 10000 : null;
}

/**
 * Calcule le coût FIFO par produit pour une liste d'ingrédients.
 *
 * Principe : sous FIFO, le stock actuel correspond aux lots d'achat les plus récents
 * (les anciens lots ont été consommés en premier par le POS).
 * On remonte les mouvements "purchase" du plus récent au plus ancien jusqu'à couvrir
 * le current_stock, et on calcule le coût moyen pondéré de ces lots restants.
 *
 * Retourne une Map<productId, unitCost> en unité de stock (portionUnit).
 * Si aucune donnée FIFO n'est disponible pour un produit, il est absent de la map
 * et le composant peut utiliser le dernier prix connu en fallback.
 */
export function useComponentFifoCosts(componentProductIds: string[], organizationId: string, establishmentId: string) {
  return useQuery({
    queryKey: ["component-fifo-costs", componentProductIds.sort().join(","), organizationId, establishmentId],
    queryFn: async () => {
      if (componentProductIds.length === 0) return new Map<string, number>();
      const supabase = createClient();

      // 1. Compositions self (main = component) pour retrouver le product_stock de chaque ingrédient
      const { data: compositions, error: cErr } = await supabase
        .from("product_compositions")
        .select("id, main_product_id, component_product_id")
        .in("main_product_id", componentProductIds)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (cErr) throw cErr;

      const selfComps = (compositions ?? []).filter((c) => c.main_product_id === c.component_product_id);
      const compositionIds = selfComps.map((c) => c.id);
      const productByCompId = new Map(selfComps.map((c) => [c.id, c.main_product_id]));

      if (compositionIds.length === 0) return new Map<string, number>();

      // 2. Stock courant par ingrédient (maintenu par le POS en temps réel)
      const { data: stocks, error: sErr } = await supabase
        .from("product_stocks")
        .select("product_composition_id, current_stock")
        .in("product_composition_id", compositionIds)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (sErr) throw sErr;

      const currentStockMap = new Map<string, number>();
      for (const s of stocks ?? []) {
        const productId = productByCompId.get(s.product_composition_id);
        if (productId) currentStockMap.set(productId, s.current_stock);
      }

      // 3. Mouvements d'achat avec unit_cost (écrits par le back-office lors des réceptions BL)
      //    Triés du plus récent au plus ancien : le stock actuel = les lots les plus récents (FIFO)
      const { data: purchases, error: pErr } = await supabase
        .from("stock_movements")
        .select("product_id, quantity, unit_cost, created_at")
        .in("product_id", componentProductIds)
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .not("unit_cost", "is", null)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      // 4. Regrouper les achats par produit
      const purchasesByProduct = new Map<string, { quantity: number; unit_cost: number }[]>();
      for (const row of purchases ?? []) {
        const list = purchasesByProduct.get(row.product_id) ?? [];
        list.push({ quantity: row.quantity, unit_cost: row.unit_cost! });
        purchasesByProduct.set(row.product_id, list);
      }

      // 5. Calcul FIFO : coût moyen pondéré des lots qui composent le stock actuel
      const fifoMap = new Map<string, number>();

      for (const productId of componentProductIds) {
        const currentStock = currentStockMap.get(productId) ?? 0;
        const batches = purchasesByProduct.get(productId) ?? [];
        const cost = computeFifoCost(currentStock, batches);
        if (cost != null) fifoMap.set(productId, cost);
      }

      return fifoMap;
    },
    enabled: componentProductIds.length > 0 && !!organizationId && !!establishmentId,
  });
}
