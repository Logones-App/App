import { NextRequest, NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildByMain,
  buildCostCtx,
  flattenLeaves,
  type CompLine,
  type ProductLike,
  type RecipeCostCtx,
} from "@/lib/recipe-cost";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number | null;
  notes?: string;
}

interface OrderBody {
  establishment_id: string;
  table_id: string;
  guest_name: string;
  menu_id?: string | null;
  orders_id?: string | null;
  items: OrderItem[];
}

async function resolveOrganizationId(
  service: SupabaseClient,
  table: { organization_id: string | null },
  establishment_id: string,
): Promise<string | null> {
  if (table.organization_id) return table.organization_id;
  const { data: est } = await service
    .from("establishments")
    .select("organization_id")
    .eq("id", establishment_id)
    .single();
  return est?.organization_id ?? null;
}

async function checkSessionActive(service: SupabaseClient, establishment_id: string): Promise<boolean> {
  const { data } = await service
    .from("device_sessions")
    .select("employee_id")
    .eq("establishment_id", establishment_id)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

type StockGraph = {
  ctx: RecipeCostCtx;
  hasStock: Set<string>;
  currentByProduct: Map<string, { current: number; tracked: boolean }>;
  stockModeById: Map<string, string>;
};

/**
 * Charge une fois le graphe de stock de l'établissement pour vérifier la dispo des produits vendus,
 * y compris en profondeur (recettes/déclinaisons `stock_mode="ingredients"` → aplatissement vers
 * les feuilles matières, cohérent avec le décrément mobile).
 */
async function buildStockGraph(
  service: SupabaseClient,
  establishment_id: string,
  organization_id: string,
): Promise<StockGraph> {
  const { data: products } = await service
    .from("products")
    .select("id, name, product_type, portion_unit, yield_quantity, yield_unit, stock_mode")
    .eq("organization_id", organization_id)
    .eq("deleted", false);
  const { data: comps } = await service
    .from("product_compositions")
    .select("id, main_product_id, component_product_id, default_quantity, quantity_unit, conversion_factor")
    .eq("establishment_id", establishment_id)
    .eq("composition_kind", "recipe")
    .eq("deleted", false);

  const rows = comps ?? [];
  const lines = rows.filter((c) => c.main_product_id !== c.component_product_id) as CompLine[];
  const byMain = buildByMain(lines);
  const ctx = buildCostCtx((products ?? []) as ProductLike[], byMain, new Map());
  const stockModeById = new Map((products ?? []).map((p) => [p.id, p.stock_mode]));

  const selfComps = rows.filter((c) => c.main_product_id === c.component_product_id);
  const compToProduct = new Map(selfComps.map((c) => [c.id, c.main_product_id]));
  const { data: stocks } = await service
    .from("product_stocks")
    .select("product_composition_id, current_stock, inventory_tracked")
    .in(
      "product_composition_id",
      selfComps.map((c) => c.id),
    )
    .eq("establishment_id", establishment_id)
    .eq("deleted", false);

  const currentByProduct = new Map<string, { current: number; tracked: boolean }>();
  const hasStock = new Set<string>();
  for (const s of stocks ?? []) {
    const pid = compToProduct.get(s.product_composition_id);
    if (!pid) continue;
    const tracked = s.inventory_tracked ?? false;
    currentByProduct.set(pid, { current: s.current_stock, tracked });
    if (tracked) hasStock.add(pid);
  }
  return { ctx, hasStock, currentByProduct, stockModeById };
}

/** Retourne le nom du produit si épuisé (dispo insuffisante), sinon null. */
function checkStock(graph: StockGraph, item: OrderItem): string | null {
  const mode = graph.stockModeById.get(item.product_id) ?? "none";
  if (mode === "none") return null;
  if (mode === "product") {
    const st = graph.currentByProduct.get(item.product_id);
    return st?.tracked && st.current < item.quantity ? item.name : null;
  }
  // "ingredients" : aplatir vers les feuilles matières (par unité) et vérifier chaque feuille suivie.
  const leaves = flattenLeaves(
    item.product_id,
    graph.ctx,
    1,
    graph.hasStock,
    new Set<string>(),
    new Map<string, number>(),
  );
  for (const [leafId, qtyPerUnit] of leaves) {
    const st = graph.currentByProduct.get(leafId);
    if (st?.tracked && st.current < qtyPerUnit * item.quantity) return item.name;
  }
  return null;
}

async function checkProductExists(service: SupabaseClient, item: OrderItem): Promise<boolean> {
  const { data } = await service.from("products").select("id").eq("id", item.product_id).maybeSingle();
  return data !== null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderBody;
    const { establishment_id, table_id, guest_name, menu_id, orders_id, items } = body;

    if (!establishment_id || !table_id || !guest_name.trim() || !items.length) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: table, error: tableErr } = await service
      .from("tables")
      .select("id, name, organization_id")
      .eq("id", table_id)
      .eq("establishment_id", establishment_id)
      .maybeSingle();

    if (tableErr || !table) {
      return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(service, table, establishment_id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 });
    }

    const sessionActive = await checkSessionActive(service, establishment_id);
    if (!sessionActive) {
      return NextResponse.json({ error: "Commandes désactivées. Demandez un serveur." }, { status: 503 });
    }

    const stockGraph = await buildStockGraph(service, establishment_id, organizationId);

    for (const item of items) {
      const outOfStock = checkStock(stockGraph, item);
      if (outOfStock) {
        return NextResponse.json({ error: "Produit épuisé", product_name: outOfStock }, { status: 409 });
      }

      const exists = await checkProductExists(service, item);
      if (!exists) {
        return NextResponse.json({ error: `Produit introuvable : ${item.name}` }, { status: 404 });
      }
    }

    const { data: order, error: orderErr } = await service
      .from("table_order_requests")
      .insert({
        establishment_id,
        organization_id: organizationId,
        table_id,
        table_label: table.name,
        guest_name: guest_name.trim(),
        menu_id: menu_id ?? null,
        order_id: orders_id ?? null,
        items: items as unknown as import("@/lib/supabase/database.types").Json,
        status: "pending",
      })
      .select("id, status, table_label, guest_name")
      .single();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
