import { NextRequest, NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

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

async function checkStock(service: SupabaseClient, item: OrderItem, establishment_id: string): Promise<string | null> {
  const { data: comp } = await service
    .from("product_compositions")
    .select("id")
    .eq("product_id", item.product_id)
    .eq("establishment_id", establishment_id)
    .limit(1)
    .maybeSingle();

  if (!comp) return null;

  const { data: stock } = await service
    .from("product_stocks")
    .select("current_stock, inventory_tracked")
    .eq("product_composition_id", comp.id)
    .eq("establishment_id", establishment_id)
    .maybeSingle();

  if (stock?.inventory_tracked && stock.current_stock < item.quantity) {
    return item.name;
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

    for (const item of items) {
      const outOfStock = await checkStock(service, item, establishment_id);
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
