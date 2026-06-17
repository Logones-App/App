import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export type StockInfo = { current_stock: number; low_stock_threshold: number | null };
export type StockResponse = Record<string, StockInfo>;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const establishmentId = searchParams.get("est");
  if (!establishmentId) return NextResponse.json({} satisfies StockResponse);

  const service = createServiceClient();

  const { data: comps } = await service
    .from("product_compositions")
    .select("id, main_product_id, component_product_id")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false);

  const selfComps = (comps ?? []).filter((c) => c.main_product_id === c.component_product_id);
  if (!selfComps.length) return NextResponse.json({} satisfies StockResponse);

  const { data: stocks } = await service
    .from("product_stocks")
    .select("product_composition_id, current_stock, low_stock_threshold")
    .in(
      "product_composition_id",
      selfComps.map((c) => c.id),
    )
    .eq("inventory_tracked", true)
    .eq("deleted", false)
    .eq("establishment_id", establishmentId);

  const compToProduct = new Map(selfComps.map((c) => [c.id, c.main_product_id]));
  const result: StockResponse = {};
  for (const stock of stocks ?? []) {
    const productId = compToProduct.get(stock.product_composition_id);
    if (productId) {
      // eslint-disable-next-line security/detect-object-injection
      result[productId] = {
        current_stock: stock.current_stock,
        low_stock_threshold: stock.low_stock_threshold,
      };
    }
  }
  return NextResponse.json(result satisfies StockResponse);
}
