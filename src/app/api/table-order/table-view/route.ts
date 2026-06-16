import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type TableViewGuest = {
  name: string;
  products: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    vat_rate: number | null;
  }[];
  subtotal: number;
};

export type TableViewResponse = {
  guests: TableViewGuest[];
  grand_total: number;
  orders_id: string;
};

type RequestItem = { name: string; quantity: number; unit_price: number; vat_rate?: number | null };
type AggProduct = {
  product_name: string;
  unit_price: number;
  vat_rate: number | null;
  quantity: number;
  total: number;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ordersId = searchParams.get("orders_id");
  const establishmentId = searchParams.get("est");

  if (!ordersId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: requests, error } = await service
    .from("table_order_requests")
    .select("guest_name, items")
    .eq("order_id", ordersId)
    .eq("establishment_id", establishmentId)
    .eq("status", "accepted");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byGuest = new Map<string, Map<string, AggProduct>>();

  for (const req of requests) {
    const items = (req.items ?? []) as RequestItem[];
    const agg = byGuest.get(req.guest_name) ?? new Map<string, AggProduct>();
    for (const item of items) {
      const key = `${item.name}||${item.unit_price}||${item.vat_rate ?? ""}`;
      const existing = agg.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.quantity * item.unit_price;
      } else {
        agg.set(key, {
          product_name: item.name,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate ?? null,
          quantity: item.quantity,
          total: item.quantity * item.unit_price,
        });
      }
    }
    byGuest.set(req.guest_name, agg);
  }

  const guests: TableViewGuest[] = Array.from(byGuest.entries()).map(([name, agg]) => {
    const products = Array.from(agg.values()).map((a) => ({
      product_name: a.product_name,
      quantity: a.quantity,
      unit_price: a.unit_price,
      total_price: a.total,
      vat_rate: a.vat_rate,
    }));
    return { name, products, subtotal: products.reduce((s, p) => s + p.total_price, 0) };
  });

  const grand_total = guests.reduce((s, g) => s + g.subtotal, 0);

  return NextResponse.json({ guests, grand_total, orders_id: ordersId } satisfies TableViewResponse);
}
