import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const establishmentId = searchParams.get("est");
  if (!establishmentId) return NextResponse.json({ ids: [] });

  const service = createServiceClient();

  const [optionRes, compRes] = await Promise.all([
    service.from("product_option_group_products").select("product_id").eq("deleted", false),
    service
      .from("product_compositions")
      .select("main_product_id")
      .eq("establishment_id", establishmentId)
      .eq("composition_kind", "modifier")
      .eq("show_in_customization", true)
      .eq("deleted", false),
  ]);

  const ids = new Set<string>();
  for (const r of optionRes.data ?? []) ids.add(r.product_id);
  for (const r of compRes.data ?? []) ids.add(r.main_product_id);

  return NextResponse.json({ ids: Array.from(ids) });
}
