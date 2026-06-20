import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type TableViewProduct = {
  kind: "product";
  product_name: string;
  amount: number;
};

export type TableViewFormulaGroup = {
  kind: "formula";
  formula_name: string;
  products: string[];
  amount: number;
};

export type TableViewItem = TableViewProduct | TableViewFormulaGroup;

export type TableViewGuest = {
  name: string;
  items: TableViewItem[];
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
type OrderProductRow = { id: string; product_name: string; order_formulas_id: string | null };

async function resolveFormulaGroups(
  service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>,
  formulaInstanceIds: string[],
): Promise<{ nameMap: Map<string, string>; subProductsMap: Map<string, string[]> }> {
  const [formulaRes, subRes] = await Promise.all([
    service.from("order_formulas").select("id, formula_name").in("id", formulaInstanceIds).eq("deleted", false),
    service
      .from("order_products")
      .select("product_name, order_formulas_id")
      .in("order_formulas_id", formulaInstanceIds)
      .eq("cancelled", false),
  ]);

  const nameMap = new Map<string, string>();
  for (const f of formulaRes.data ?? []) nameMap.set(f.id, f.formula_name);

  const subProductsMap = new Map<string, string[]>();
  for (const p of subRes.data ?? []) {
    if (!p.order_formulas_id) continue;
    const list = subProductsMap.get(p.order_formulas_id) ?? [];
    list.push(p.product_name);
    subProductsMap.set(p.order_formulas_id, list);
  }

  return { nameMap, subProductsMap };
}

function buildItems(
  rows: { order_products_id: string | null; orders_payments_id: string | null; amount: number | null }[],
  productMap: Map<string, OrderProductRow>,
  paymentMap: Map<string, string>,
  formulaNameMap: Map<string, string>,
  formulaSubProductsMap: Map<string, string[]>,
): Map<string, TableViewItem[]> {
  const byGuest = new Map<string, TableViewItem[]>();
  for (const name of paymentMap.values()) byGuest.set(name, []);

  for (const row of rows) {
    if (!row.order_products_id || !row.orders_payments_id) continue;
    const product = productMap.get(row.order_products_id);
    if (!product) continue;
    const guestName = paymentMap.get(row.orders_payments_id);
    if (!guestName) continue;

    const items = byGuest.get(guestName)!;
    if (product.order_formulas_id) {
      items.push({
        kind: "formula",
        formula_name: formulaNameMap.get(product.order_formulas_id) ?? "Formule",
        products: formulaSubProductsMap.get(product.order_formulas_id) ?? [product.product_name],
        amount: row.amount ?? 0,
      });
    } else {
      items.push({ kind: "product", product_name: product.product_name, amount: row.amount ?? 0 });
    }
  }
  return byGuest;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ordersId = searchParams.get("orders_id");
  const establishmentId = searchParams.get("est");

  if (!ordersId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

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

  const { data: rows, error: rowsErr } = await service
    .from("order_payments_rows")
    .select("order_products_id, orders_payments_id, amount")
    .in("orders_payments_id", paymentIds)
    .eq("deleted", false);

  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  const activeProductIds = rows.map((r) => r.order_products_id).filter((id): id is string => id !== null);

  if (!activeProductIds.length) {
    const guests = payments.map((p) => ({ name: p.name, items: [] as TableViewItem[], subtotal: 0 }));
    return NextResponse.json({ guests, pending, grand_total: 0, orders_id: ordersId } satisfies TableViewResponse);
  }

  const { data: productRows, error: productsErr } = await service
    .from("order_products")
    .select("id, product_name, order_formulas_id")
    .in("id", activeProductIds)
    .eq("cancelled", false);

  if (productsErr) return NextResponse.json({ error: productsErr.message }, { status: 500 });

  const productMap = new Map<string, OrderProductRow>(productRows.map((p) => [p.id, p]));

  const formulaInstanceIds = [
    ...new Set(productRows.map((p) => p.order_formulas_id).filter((id): id is string => id !== null)),
  ];

  const { nameMap: formulaNameMap, subProductsMap: formulaSubProductsMap } =
    formulaInstanceIds.length > 0
      ? await resolveFormulaGroups(service, formulaInstanceIds)
      : { nameMap: new Map<string, string>(), subProductsMap: new Map<string, string[]>() };

  const paymentMap = new Map(payments.map((p) => [p.id, p.name]));
  const byGuest = buildItems(rows, productMap, paymentMap, formulaNameMap, formulaSubProductsMap);

  const guests: TableViewGuest[] = Array.from(byGuest.entries()).map(([name, items]) => ({
    name,
    items,
    subtotal: items.reduce((s, item) => s + item.amount, 0),
  }));

  const grand_total = guests.reduce((s, g) => s + g.subtotal, 0);

  return NextResponse.json({ guests, pending, grand_total, orders_id: ordersId } satisfies TableViewResponse);
}
