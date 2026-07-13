import type { GridTapIntent } from "@/lib/menu-grid/category-grid-action";
import type { Tables } from "@/lib/supabase/database.types";

import { GRID_SIZE, PANEL_COUNT } from "./menu-products-grid-constants";

export type GridItem = Tables<"category_grid_items"> & {
  product?: { is_available: boolean | null; vat_rate?: { value: number | null } | null } | null;
  menuProductPrice?: number | null;
  /** Taux de TVA du produit (%) — affiché à côté du prix sur la tuile. */
  productVatRate?: number | null;
};
export type NavCrumb = { id: string; label: string | null };

export function buildPanelMaps(items: GridItem[]) {
  const maps: Map<string, GridItem>[] = [new Map(), new Map(), new Map()];
  for (const item of items) {
    const row = item.grid_row;
    const col = item.grid_column;
    if (row < 0 || row > GRID_SIZE - 1) continue;
    const panel = Math.floor(col / GRID_SIZE);
    if (panel < 0 || panel > PANEL_COUNT - 1) continue;
    const localCol = col % GRID_SIZE;
    const key = `${row}-${localCol}`;
    if (panel === 0) maps[0].set(key, item);
    else if (panel === 1) maps[1].set(key, item);
    else maps[2].set(key, item);
  }
  return maps;
}

export function isCategoryNavigable(item: GridItem) {
  return item.item_type === "category";
}

export function tapIntentTranslationKey(intent: GridTapIntent): string {
  switch (intent.kind) {
    case "enter_subcategory":
      return "products_grid_tap_intent_enter_subcategory";
    case "product_tap":
      return "products_grid_tap_intent_product_tap";
    case "nav_back":
      return "products_grid_tap_intent_nav_back";
    case "nav_root":
      return "products_grid_tap_intent_nav_root";
    case "nav_home":
      return "products_grid_tap_intent_nav_home";
    case "open_category":
      return "products_grid_tap_intent_open_category";
    case "show_product":
      return "products_grid_tap_intent_show_product";
    case "custom":
      return "products_grid_tap_intent_custom";
    case "none":
      return "products_grid_tap_intent_none";
    default:
      return "products_grid_tap_intent_none";
  }
}

/** Accès indexé contrôlé (évite avertissement security/detect-object-injection sur `panelMaps[panel]`). */
export function getPanelMapAt(
  panelMaps: Map<string, GridItem>[],
  panelIndex: number,
): Map<string, GridItem> | undefined {
  if (panelIndex === 0) return panelMaps[0];
  if (panelIndex === 1) return panelMaps[1];
  if (panelIndex === 2) return panelMaps[2];
  return undefined;
}

export function getCellOccupant(
  panelMaps: Map<string, GridItem>[],
  panelIndex: number,
  row: number,
  localCol: number,
): GridItem | undefined {
  const map = getPanelMapAt(panelMaps, panelIndex);
  const key = `${row}-${localCol}`;
  return map?.get(key);
}
