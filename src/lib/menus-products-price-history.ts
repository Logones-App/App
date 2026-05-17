import { createClient } from "@/lib/supabase/client";

export type MenusProductPriceHistorySource = "grid_ui" | "product_dashboard" | "menu_products_table";

export async function insertMenusProductPriceHistoryRow(
  supabase: ReturnType<typeof createClient>,
  menusProductsId: string,
  salePrice: number,
  source: MenusProductPriceHistorySource | string = "grid_ui",
) {
  const { error } = await supabase.from("menus_products_price_history").insert({
    menus_products_id: menusProductsId,
    sale_price: salePrice,
    source,
  });
  if (error) throw error;
}
