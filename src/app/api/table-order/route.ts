import { NextRequest, NextResponse } from "next/server";

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
  items: OrderItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderBody;
    const { establishment_id, table_id, guest_name, items } = body;

    if (!establishment_id || !table_id || !guest_name?.trim() || !items?.length) {
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

    let organizationId: string | null = table.organization_id ?? null;
    if (!organizationId) {
      const { data: est } = await service
        .from("establishments")
        .select("organization_id")
        .eq("id", establishment_id)
        .single();
      organizationId = est?.organization_id ?? null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await service
      .from("table_order_requests")
      .insert({
        establishment_id,
        organization_id: organizationId,
        table_id,
        table_label: table.name,
        guest_name: guest_name.trim(),
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
