import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type FormulaProduct = {
  product_id: string;
  product_name: string;
  product_description: string | null;
  supplement_price: number | null;
};

export type FormulaSlot = {
  id: string;
  name: string;
  slot_order: number;
  products: FormulaProduct[];
};

export type Formula = {
  id: string;
  name: string;
  price: number;
  menu_id: string;
  slots: FormulaSlot[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const menuId = searchParams.get("menu_id");
  const establishmentId = searchParams.get("est");

  if (!menuId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: formulaRows, error: fErr } = await service
    .from("formulas")
    .select("id, name, price, menu_id")
    .eq("menu_id", menuId)
    .eq("deleted", false)
    .eq("is_active", true)
    .order("display_order");

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  if (!formulaRows.length) return NextResponse.json([] satisfies Formula[]);

  const formulaIds = formulaRows.map((f) => f.id);

  const { data: slotRows, error: sErr } = await service
    .from("formula_slots")
    .select("id, name, slot_order, formula_id")
    .in("formula_id", formulaIds)
    .eq("deleted", false)
    .order("slot_order");

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!slotRows.length) return NextResponse.json([] satisfies Formula[]);

  // Filtre par formula_id (pas slot_id) — spec POS
  const { data: fpRows, error: fpErr } = await service
    .from("formula_products")
    .select("slot_id, product_id, supplement_price")
    .in("formula_id", formulaIds)
    .eq("deleted", false)
    .eq("is_active", true);

  if (fpErr) return NextResponse.json({ error: fpErr.message }, { status: 500 });

  const productIds = [...new Set(fpRows.map((fp) => fp.product_id))];

  const { data: productRows, error: pErr } = await service
    .from("products")
    .select("id, name, description")
    .in("id", productIds);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const productMap = new Map(productRows.map((p) => [p.id, { name: p.name, description: p.description }]));

  const slotProductsMap = new Map<string, FormulaProduct[]>();
  for (const fp of fpRows) {
    const product = productMap.get(fp.product_id);
    if (!product) continue;
    const list = slotProductsMap.get(fp.slot_id) ?? [];
    list.push({
      product_id: fp.product_id,
      product_name: product.name,
      product_description: product.description ?? null,
      supplement_price: fp.supplement_price,
    });
    slotProductsMap.set(fp.slot_id, list);
  }

  const slotsMap = new Map<string, FormulaSlot[]>();
  for (const slot of slotRows) {
    const list = slotsMap.get(slot.formula_id) ?? [];
    list.push({
      id: slot.id,
      name: slot.name,
      slot_order: slot.slot_order,
      products: slotProductsMap.get(slot.id) ?? [],
    });
    slotsMap.set(slot.formula_id, list);
  }

  const result: Formula[] = formulaRows.map((f) => ({
    id: f.id,
    name: f.name,
    price: f.price,
    menu_id: f.menu_id,
    slots: slotsMap.get(f.id) ?? [],
  }));

  return NextResponse.json(result);
}
