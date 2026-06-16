import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type OpenOrderResponse = { ordersId: string; names: string[] } | { ordersId: null };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get("table");
  const establishmentId = searchParams.get("est");

  if (!tableId || !establishmentId) {
    return NextResponse.json({ ordersId: null } satisfies OpenOrderResponse);
  }

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id")
    .eq("tables_id", tableId)
    .eq("establishment_id", establishmentId)
    .eq("opened", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) return NextResponse.json({ ordersId: null } satisfies OpenOrderResponse);

  const { data: payments } = await service
    .from("order_payments")
    .select("name")
    .eq("orders_id", order.id)
    .eq("establishment_id", establishmentId)
    .eq("deleted", false);

  const names = [...new Set((payments ?? []).map((p) => p.name))];

  return NextResponse.json({ ordersId: order.id, names } satisfies OpenOrderResponse);
}
