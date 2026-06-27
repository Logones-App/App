"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

// Colonnes FIFO ajoutées via ALTER TABLE — pas encore dans les types générés.
type SaleMovementRow = {
  recipe_product_id: string | null;
  quantity: number;
  unit_cost: number | null;
  movement_type: string;
};

export type MarginRow = {
  recipeProductId: string;
  recipeName: string;
  qtySold: number;
  revenueHt: number;
  revenueTtc: number;
  cogs: number;
  /** false si aucun coût FIFO n'est enregistré pour ce produit (marge non fiable). */
  costTracked: boolean;
  marginEur: number;
  marginPct: number | null;
  foodCostPct: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// COGS FIFO par recette (recipe_product_id), sur la période. Net des restitutions ('restore').
function buildCogsMap(rows: SaleMovementRow[]) {
  const cogsByRecipe = new Map<string, number>();
  for (const row of rows) {
    const rid = row.recipe_product_id as string;
    const delta = Math.abs(row.quantity) * (row.unit_cost as number);
    cogsByRecipe.set(rid, (cogsByRecipe.get(rid) ?? 0) + (row.movement_type === "sale" ? delta : -delta));
  }
  return cogsByRecipe;
}

// CA par produit vendu (HT calculé via vat_rate), agrégé sur les commandes de la période.
type SalesAgg = { qty: number; ht: number; ttc: number };
function buildSalesMap(
  opRaw: {
    product_id: string | null;
    total_price: number;
    quantity: number;
    vat_rate: number | null;
    cancelled: boolean;
  }[],
) {
  const salesByProduct = new Map<string, SalesAgg>();
  for (const op of opRaw) {
    if (!op.product_id || op.cancelled) continue;
    const ttc = op.total_price ?? 0;
    const ht = op.vat_rate ? ttc / (1 + op.vat_rate) : ttc;
    const e = salesByProduct.get(op.product_id) ?? { qty: 0, ht: 0, ttc: 0 };
    e.qty += op.quantity ?? 0;
    e.ht += ht;
    e.ttc += ttc;
    salesByProduct.set(op.product_id, e);
  }
  return salesByProduct;
}

// ── Marge & rentabilité par produit ───────────────────────────────────────
// Croise le CA HT (ventes POS) avec le coût matière FIFO. La marge n'est fiable
// que pour les produits dont le coût est suivi (costTracked).
export function useMarginByProduct(establishmentId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["margin-by-product", establishmentId, from, to],
    queryFn: async (): Promise<MarginRow[]> => {
      const supabase = createClient();

      const [{ data: rawCost, error: cErr }, { data: ordersRaw, error: oErr }] = await Promise.all([
        supabase
          .from("stock_movements")
          .select("recipe_product_id, quantity, unit_cost, movement_type")
          .eq("establishment_id", establishmentId)
          .in("movement_type", ["sale", "restore"])
          .not("unit_cost", "is", null)
          .not("recipe_product_id", "is", null)
          .eq("deleted", false)
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("orders")
          .select("id")
          .eq("establishment_id", establishmentId)
          .eq("deleted", false)
          .gte("created_at", from)
          .lte("created_at", to),
      ]);
      if (cErr) throw cErr;
      if (oErr) throw oErr;

      const cogsByRecipe = buildCogsMap(rawCost as unknown as SaleMovementRow[]);

      const orderIds = ordersRaw.map((o) => o.id);
      let salesByProduct = new Map<string, SalesAgg>();
      if (orderIds.length > 0) {
        const { data: opRaw, error: opErr } = await supabase
          .from("order_products")
          .select("product_id, total_price, quantity, vat_rate, cancelled")
          .in("order_id", orderIds)
          .eq("deleted", false);
        if (opErr) throw opErr;
        salesByProduct = buildSalesMap(opRaw);
      }

      const ids = [...salesByProduct.keys()];
      if (ids.length === 0) return [];

      const { data: products, error: pErr } = await supabase.from("products").select("id, name").in("id", ids);
      if (pErr) throw pErr;
      const nameMap = new Map(products.map((p) => [p.id, p.name]));

      return ids
        .map((id) => {
          const sale = salesByProduct.get(id) as SalesAgg;
          const costTracked = cogsByRecipe.has(id);
          const cogs = round2(cogsByRecipe.get(id) ?? 0);
          const revenueHt = round2(sale.ht);
          const revenueTtc = round2(sale.ttc);
          const marginEur = round2(revenueHt - cogs);
          const marginPct = revenueHt > 0 ? Math.round((marginEur / revenueHt) * 1000) / 10 : null;
          const foodCostPct = revenueHt > 0 ? Math.round((cogs / revenueHt) * 1000) / 10 : null;
          return {
            recipeProductId: id,
            recipeName: nameMap.get(id) ?? id,
            qtySold: sale.qty,
            revenueHt,
            revenueTtc,
            cogs,
            costTracked,
            marginEur,
            marginPct,
            foodCostPct,
          } satisfies MarginRow;
        })
        .sort((a, b) => b.marginEur - a.marginEur);
    },
    enabled: !!establishmentId,
  });
}
