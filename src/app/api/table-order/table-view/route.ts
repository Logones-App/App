import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type TableViewProduct = {
  product_name: string;
  amount: number;
};

export type TableViewGuest = {
  name: string;
  products: TableViewProduct[];
  subtotal: number;
};

export type PendingItem = {
  name: string;
  quantity: number;
};

export type PendingRequest = {
  guest_name: string;
  items: PendingItem[];
};

export type TableViewResponse = {
  guests: TableViewGuest[];
  pending: PendingRequest[];
  grand_total: number;
  orders_id: string;
};

type PendingItemRaw = { name: string; quantity: number };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ordersId = searchParams.get("orders_id");
  const establishmentId = searchParams.get("est");

  if (!ordersId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  // 1 + 4 en parallèle : notes confirmées + rounds en attente
  const [paymentsRes, pendingRes] = await Promise.all([
    service.from("order_payments").select("id, name").eq("orders_id", ordersId).neq("deleted", true),
    service.from("table_order_requests").select("guest_name, items").eq("order_id", ordersId).eq("status", "pending"),
  ]);

  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });

  const pending: PendingRequest[] = (pendingRes.data ?? []).map((req) => ({
    guest_name: req.guest_name,
    items: ((req.items ?? []) as PendingItemRaw[]).map((item) => ({ name: item.name, quantity: item.quantity })),
  }));

  const payments = paymentsRes.data;

  if (!payments.length) {
    return NextResponse.json({ guests: [], pending, grand_total: 0, orders_id: ordersId } satisfies TableViewResponse);
  }

  const paymentIds = payments.map((p) => p.id);

  // 2. Attributions produit → note (deleted = false)
  const { data: rows, error: rowsErr } = await service
    .from("order_payments_rows")
    .select("order_products_id, orders_payments_id, amount")
    .in("orders_payments_id", paymentIds)
    .eq("deleted", false);

  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  const activeProductIds = rows.map((r) => r.order_products_id).filter((id): id is string => id !== null);

  if (!activeProductIds.length) {
    const guests = payments.map((p) => ({ name: p.name, products: [], subtotal: 0 }));
    return NextResponse.json({ guests, pending, grand_total: 0, orders_id: ordersId } satisfies TableViewResponse);
  }

  // 3. Produits actifs (cancelled = false)
  const { data: productRows, error: productsErr } = await service
    .from("order_products")
    .select("id, product_name")
    .in("id", activeProductIds)
    .eq("cancelled", false);

  if (productsErr) return NextResponse.json({ error: productsErr.message }, { status: 500 });

  const productMap = new Map(productRows.map((p) => [p.id, p.product_name]));
  const paymentMap = new Map(payments.map((p) => [p.id, p.name]));
  const byGuest = new Map<string, TableViewProduct[]>(payments.map((p) => [p.name, []]));

  for (const row of rows) {
    if (!row.order_products_id || !row.orders_payments_id) continue;
    const productName = productMap.get(row.order_products_id);
    if (!productName) continue;
    const guestName = paymentMap.get(row.orders_payments_id);
    if (!guestName) continue;
    byGuest.get(guestName)?.push({ product_name: productName, amount: row.amount ?? 0 });
  }

  const guests: TableViewGuest[] = Array.from(byGuest.entries()).map(([name, products]) => ({
    name,
    products,
    subtotal: products.reduce((s, p) => s + p.amount, 0),
  }));

  const grand_total = guests.reduce((s, g) => s + g.subtotal, 0);

  return NextResponse.json({ guests, pending, grand_total, orders_id: ordersId } satisfies TableViewResponse);
}
