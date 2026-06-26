"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

// Colonnes ajoutées via ALTER TABLE — pas encore dans les types générés Supabase
type SaleMovementRow = {
  recipe_product_id: string | null;
  quantity: number;
  unit_cost: number | null;
  movement_type: string;
  reference_id: string | null;
  created_at: string;
};

type PurchaseMovementRow = {
  product_id: string;
  quantity: number;
  unit_cost: number | null;
  unit: string | null;
  created_at: string;
  remaining_quantity: number | null;
};

export type COGSRow = { date: string; cogs: number; orderCount: number };

export type FoodCostRow = {
  recipeProductId: string;
  recipeName: string;
  cogs: number;
  revenue: number;
  foodCostPct: number | null;
};

export type IngredientCostRow = {
  productId: string;
  productName: string;
  purchaseDate: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
  totalCost: number;
};

export type StockValuationRow = {
  productId: string;
  productName: string;
  unit: string | null;
  fifoUnitCost: number;
  stockValue: number;
  remainingQty: number;
};

// ── Hook 1 : COGS journalier ──────────────────────────────────────────────
export function useFifoCOGSByPeriod(establishmentId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["fifo-cogs", establishmentId, from, to],
    queryFn: async () => {
      const supabase = createClient();
      const { data: raw, error } = await supabase
        .from("stock_movements")
        .select("created_at, quantity, unit_cost, movement_type, reference_id")
        .eq("establishment_id", establishmentId)
        .in("movement_type", ["sale", "restore"])
        .not("unit_cost", "is", null)
        .eq("deleted", false)
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;

      const rows = raw as unknown as SaleMovementRow[];
      const byDate = new Map<string, { cogs: number; ids: Set<string> }>();

      for (const row of rows) {
        const date = row.created_at.slice(0, 10);
        const entry = byDate.get(date) ?? { cogs: 0, ids: new Set<string>() };
        const delta = Math.abs(row.quantity) * (row.unit_cost as number);
        entry.cogs += row.movement_type === "sale" ? delta : -delta;
        if (row.movement_type === "sale" && row.reference_id) entry.ids.add(row.reference_id);
        byDate.set(date, entry);
      }

      return [...byDate.entries()]
        .map(([date, e]) => ({ date, cogs: Math.round(e.cogs * 100) / 100, orderCount: e.ids.size }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!establishmentId,
  });
}

// ── Hook 2 : Food cost par recette ────────────────────────────────────────
export function useFifoFoodCostByRecipe(establishmentId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["fifo-food-cost", establishmentId, from, to],
    queryFn: async () => {
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

      const costRows = rawCost as unknown as SaleMovementRow[];
      const orderIds = ordersRaw.map((o) => o.id);

      const cogsByRecipe = new Map<string, number>();
      for (const row of costRows) {
        const rid = row.recipe_product_id as string;
        const prev = cogsByRecipe.get(rid) ?? 0;
        const delta = Math.abs(row.quantity) * (row.unit_cost as number);
        cogsByRecipe.set(rid, prev + (row.movement_type === "sale" ? delta : -delta));
      }

      const revenueByRecipe = new Map<string, number>();
      if (orderIds.length > 0) {
        const { data: opRaw, error: opErr } = await supabase
          .from("order_products")
          .select("product_id, total_price, cancelled")
          .in("order_id", orderIds)
          .eq("deleted", false);
        if (opErr) throw opErr;
        for (const op of opRaw) {
          if (!op.product_id || op.cancelled) continue;
          revenueByRecipe.set(op.product_id, (revenueByRecipe.get(op.product_id) ?? 0) + op.total_price);
        }
      }

      const recipeIds = [...cogsByRecipe.keys()];
      if (!recipeIds.length) return [] as FoodCostRow[];

      const { data: products, error: pErr } = await supabase.from("products").select("id, name").in("id", recipeIds);
      if (pErr) throw pErr;

      const nameMap = new Map(products.map((p) => [p.id, p.name]));

      return recipeIds
        .map((id) => {
          const cogs = Math.round((cogsByRecipe.get(id) ?? 0) * 100) / 100;
          const revenue = Math.round((revenueByRecipe.get(id) ?? 0) * 100) / 100;
          const foodCostPct = revenue > 0 ? Math.round((cogs / revenue) * 1000) / 10 : null;
          return { recipeProductId: id, recipeName: nameMap.get(id) ?? id, cogs, revenue, foodCostPct };
        })
        .sort((a, b) => (b.foodCostPct ?? 999) - (a.foodCostPct ?? 999));
    },
    enabled: !!establishmentId,
  });
}

// ── Hook 3 : Historique prix d'achat ─────────────────────────────────────
export function useFifoIngredientCostHistory(establishmentId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["fifo-ingredient-cost", establishmentId, from, to],
    queryFn: async () => {
      const supabase = createClient();
      const { data: raw, error } = await supabase
        .from("stock_movements")
        .select("product_id, quantity, unit_cost, unit, created_at")
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .not("unit_cost", "is", null)
        .eq("deleted", false)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = raw as unknown as PurchaseMovementRow[];
      const productIds = [...new Set(rows.map((r) => r.product_id))];
      if (!productIds.length) return [] as IngredientCostRow[];

      const { data: products, error: pErr } = await supabase.from("products").select("id, name").in("id", productIds);
      if (pErr) throw pErr;

      const nameMap = new Map(products.map((p) => [p.id, p.name]));

      return rows.map((row) => ({
        productId: row.product_id,
        productName: nameMap.get(row.product_id) ?? row.product_id,
        purchaseDate: row.created_at.slice(0, 10),
        quantity: row.quantity,
        unit: row.unit ?? null,
        unitCost: row.unit_cost as number,
        totalCost: Math.round(row.quantity * (row.unit_cost as number) * 100) / 100,
      }));
    },
    enabled: !!establishmentId,
  });
}

// ── Hook 4 : Valorisation stock FIFO ─────────────────────────────────────
export function useFifoStockValuation(establishmentId: string) {
  return useQuery({
    queryKey: ["fifo-stock-valuation", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: raw, error } = await supabase
        .from("stock_movements")
        .select("product_id, remaining_quantity, unit_cost, unit")
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .gt("remaining_quantity", 0)
        .not("unit_cost", "is", null)
        .eq("deleted", false);
      if (error) throw error;

      const rows = raw as unknown as PurchaseMovementRow[];
      const productIds = [...new Set(rows.map((r) => r.product_id))];
      if (!productIds.length) return [] as StockValuationRow[];

      const { data: products, error: pErr } = await supabase.from("products").select("id, name").in("id", productIds);
      if (pErr) throw pErr;

      const nameMap = new Map(products.map((p) => [p.id, p.name]));
      const byProduct = new Map<string, { name: string; unit: string | null; val: number; qty: number }>();

      for (const row of rows) {
        const rem = row.remaining_quantity as number;
        const cost = row.unit_cost as number;
        const entry = byProduct.get(row.product_id) ?? {
          name: nameMap.get(row.product_id) ?? row.product_id,
          unit: row.unit ?? null,
          val: 0,
          qty: 0,
        };
        entry.val += rem * cost;
        entry.qty += rem;
        byProduct.set(row.product_id, entry);
      }

      return [...byProduct.entries()]
        .map(([productId, e]) => ({
          productId,
          productName: e.name,
          unit: e.unit,
          fifoUnitCost: e.qty > 0 ? Math.round((e.val / e.qty) * 10000) / 10000 : 0,
          stockValue: Math.round(e.val * 100) / 100,
          remainingQty: Math.round(e.qty * 100) / 100,
        }))
        .sort((a, b) => b.stockValue - a.stockValue);
    },
    enabled: !!establishmentId,
  });
}
