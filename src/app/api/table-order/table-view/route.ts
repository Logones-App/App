import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type TableViewGuest = {
  name: string;
  allPaid: boolean;
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ordersId = searchParams.get("orders_id");
  const establishmentId = searchParams.get("est");

  if (!ordersId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: payments, error } = await service
    .from("order_payments")
    .select(
      `id, name, paid,
       order_payments_rows(
         order_products_id,
         order_product:order_products_id(product_name, quantity, unit_price, total_price, vat_rate, cancelled)
       )`,
    )
    .eq("orders_id", ordersId)
    .eq("establishment_id", establishmentId)
    .eq("deleted", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type RawProduct = {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    vat_rate: number | null;
    cancelled: boolean;
  };
  type RawRow = { order_products_id: string | null; order_product: RawProduct | null };
  type RawPayment = { id: string; name: string; paid: boolean | null; order_payments_rows: RawRow[] };

  const byName = new Map<string, { paid: boolean[]; products: TableViewGuest["products"] }>();

  for (const p of payments as unknown as RawPayment[]) {
    const entry = byName.get(p.name) ?? { paid: [], products: [] };
    entry.paid.push(p.paid === true);
    for (const row of p.order_payments_rows) {
      const prod = row.order_product;
      if (!prod || prod.cancelled) continue;
      entry.products.push({
        product_name: prod.product_name,
        quantity: prod.quantity,
        unit_price: prod.unit_price,
        total_price: prod.total_price,
        vat_rate: prod.vat_rate,
      });
    }
    byName.set(p.name, entry);
  }

  const guests: TableViewGuest[] = Array.from(byName.entries()).map(([name, { paid, products }]) => ({
    name,
    allPaid: paid.every(Boolean),
    products,
    subtotal: products.reduce((s, p) => s + p.total_price, 0),
  }));

  const grand_total = guests.reduce((s, g) => s + g.subtotal, 0);

  return NextResponse.json({ guests, grand_total, orders_id: ordersId } satisfies TableViewResponse);
}
