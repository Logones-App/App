import { NextRequest, NextResponse } from "next/server";

import type {
  CustomizationData,
  ModifierComposition,
  OptionGroup,
  OptionValue,
} from "@/app/[locale]/(root)/(public)/[slug]/commander/_components/customization-utils";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id");
  const establishmentId = searchParams.get("est");
  const menusId = searchParams.get("menus_id");

  if (!productId || !establishmentId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  // 1. Groupes d'options assignés au produit
  const groupsPromise = service
    .from("product_option_group_products")
    .select(
      "display_order, option_group_id, option_group:product_option_groups(id, name, selection_type, is_required, max_selections, allow_quantity)",
    )
    .eq("product_id", productId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });

  // 3. Compositions modifier du produit
  const compositionsPromise = service
    .from("product_compositions")
    .select(
      "id, component_product_id, is_required, default_quantity, max_quantity, unit_supplement_price, price_multiplier",
    )
    .eq("main_product_id", productId)
    .eq("establishment_id", establishmentId)
    .eq("composition_kind", "modifier")
    .eq("show_in_customization", true)
    .eq("deleted", false);

  const [groupsRes, compositionsRes] = await Promise.all([groupsPromise, compositionsPromise]);

  const rawGroups = (groupsRes.data ?? []).map((r) => r.option_group as OptionGroup);

  const groupIds = rawGroups.map((g) => g.id);
  const compositions = (compositionsRes.data ?? []) as ModifierComposition[];
  const componentIds = compositions.map((c) => c.component_product_id);

  // 2. Valeurs des groupes + 4. Noms composants + 5. Prix composants (parallèles)
  const valuesPromise = groupIds.length
    ? service
        .from("product_option_group_values")
        .select(
          "id, option_group_id, option_name, option_value, option_price, display_order, min_quantity, max_quantity",
        )
        .in("option_group_id", groupIds)
        .eq("deleted", false)
        .eq("is_visible", true)
        .order("display_order", { ascending: true })
    : Promise.resolve({ data: [] });

  const namesPromise = componentIds.length
    ? service.from("products").select("id, name").in("id", componentIds).eq("deleted", false)
    : Promise.resolve({ data: [] });

  const pricesPromise =
    componentIds.length && menusId
      ? service
          .from("menus_products")
          .select("products_id, price")
          .in("products_id", componentIds)
          .eq("menus_id", menusId)
          .eq("deleted", false)
      : Promise.resolve({ data: [] });

  const [valuesRes, namesRes, pricesRes] = await Promise.all([valuesPromise, namesPromise, pricesPromise]);

  const optionValues = (valuesRes.data ?? []) as OptionValue[];

  const componentNames: Partial<Record<string, string>> = {};
  for (const p of namesRes.data ?? []) {
    componentNames[p.id] = p.name;
  }

  const componentPrices: Partial<Record<string, number>> = {};
  for (const mp of pricesRes.data ?? []) {
    if (mp.products_id) componentPrices[mp.products_id] = mp.price ?? 0;
  }

  const result: CustomizationData = {
    optionGroups: rawGroups,
    optionValues,
    compositions,
    componentNames,
    componentPrices,
  };

  return NextResponse.json(result);
}
