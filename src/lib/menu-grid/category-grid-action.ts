import { z } from "zod";

/** Valeurs `action.type` pour `category_grid_items.action` (JSON). */
export const CATEGORY_GRID_ACTION_TYPES = [
  "none",
  "back",
  "navigate_root",
  "navigate_home",
  "open_category",
  "show_product",
  "custom",
] as const;

export type CategoryGridActionType = (typeof CATEGORY_GRID_ACTION_TYPES)[number];

const actionTypeZodEnum = CATEGORY_GRID_ACTION_TYPES as unknown as [
  CategoryGridActionType,
  ...CategoryGridActionType[],
];

export const categoryGridActionSchema = z.object({
  type: z.enum(actionTypeZodEnum),
  parameters: z.record(z.unknown()).default({}),
});

export type CategoryGridAction = z.infer<typeof categoryGridActionSchema>;

export function defaultCategoryGridAction(): CategoryGridAction {
  return { type: "none", parameters: {} };
}

/** Parse sécurisé : invalide ou absent → `{ type: "none", parameters: {} }`. */
export function parseCategoryGridAction(raw: unknown): CategoryGridAction {
  const parsed = categoryGridActionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return defaultCategoryGridAction();
}

/** Prêt pour Supabase `Json`. */
export function categoryGridActionToJson(action: CategoryGridAction): {
  type: string;
  parameters: Record<string, unknown>;
} {
  return {
    type: action.type,
    parameters: action.parameters,
  };
}

/** Sous-ensemble exposé dans la palette admin (tuiles navigation). */
export const PALETTE_GRID_ACTION_PRESETS = ["back", "navigate_root", "navigate_home"] as const;
export type PaletteGridActionPreset = (typeof PALETTE_GRID_ACTION_PRESETS)[number];

export function isPaletteGridActionPreset(v: string): v is PaletteGridActionPreset {
  return (PALETTE_GRID_ACTION_PRESETS as readonly string[]).includes(v);
}

/** Forme minimale pour le moteur caisse (à brancher côté client caisse). */
export type GridTapIntent =
  | { kind: "enter_subcategory"; gridItemId: string }
  | { kind: "product_tap"; productId: string }
  | { kind: "nav_back"; parameters: Record<string, unknown> }
  | { kind: "nav_root"; parameters: Record<string, unknown> }
  | { kind: "nav_home"; parameters: Record<string, unknown> }
  | { kind: "open_category"; categoryId: string | null; parameters: Record<string, unknown> }
  | { kind: "show_product"; productId: string | null; parameters: Record<string, unknown> }
  | { kind: "custom"; parameters: Record<string, unknown> }
  | { kind: "none" };

export type GridItemActionContext = {
  id: string;
  item_type: string;
  category_id: string | null;
  product_id: string | null;
  action: unknown;
};

function intentFromParsedAction(action: CategoryGridAction, item: GridItemActionContext): GridTapIntent | null {
  switch (action.type) {
    case "none":
      return null;
    case "back":
      return { kind: "nav_back", parameters: { ...action.parameters } };
    case "navigate_root":
      return { kind: "nav_root", parameters: { ...action.parameters } };
    case "navigate_home":
      return { kind: "nav_home", parameters: { ...action.parameters } };
    case "open_category": {
      const cid = typeof action.parameters.category_id === "string" ? action.parameters.category_id : item.category_id;
      return { kind: "open_category", categoryId: cid, parameters: { ...action.parameters } };
    }
    case "show_product": {
      const pid = typeof action.parameters.product_id === "string" ? action.parameters.product_id : item.product_id;
      return { kind: "show_product", productId: pid, parameters: { ...action.parameters } };
    }
    case "custom":
      return { kind: "custom", parameters: { ...action.parameters } };
    default:
      return null;
  }
}

/**
 * Règles :
 * 1. `item_type === "action"` → comportement uniquement depuis `action` (sinon `none`).
 * 2. Sinon, si `action.type !== "none"` → cette action prime sur le défaut catégorie / produit.
 * 3. Sinon → catégorie = sous-niveau, produit = tap produit.
 */
export function resolveGridTapIntent(item: GridItemActionContext): GridTapIntent {
  const parsed = parseCategoryGridAction(item.action);

  if (item.item_type === "action") {
    return intentFromParsedAction(parsed, item) ?? { kind: "none" };
  }

  if (parsed.type !== "none") {
    const intent = intentFromParsedAction(parsed, item);
    if (intent) return intent;
  }

  if (item.item_type === "category") {
    return { kind: "enter_subcategory", gridItemId: item.id };
  }
  if (item.item_type === "product" && item.product_id) {
    return { kind: "product_tap", productId: item.product_id };
  }
  return { kind: "none" };
}
