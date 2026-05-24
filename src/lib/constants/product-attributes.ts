// ─── Allergènes réglementaires UE (14) ────────────────────────────────────────

export type AllergenKey =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soy"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

export const ALLERGENS: { key: AllergenKey; label: string; emoji: string }[] = [
  { key: "gluten", label: "Gluten", emoji: "🌾" },
  { key: "crustaceans", label: "Crustacés", emoji: "🦐" },
  { key: "eggs", label: "Œufs", emoji: "🥚" },
  { key: "fish", label: "Poissons", emoji: "🐟" },
  { key: "peanuts", label: "Arachides", emoji: "🥜" },
  { key: "soy", label: "Soja", emoji: "🫘" },
  { key: "milk", label: "Lait", emoji: "🥛" },
  { key: "nuts", label: "Fruits à coque", emoji: "🌰" },
  { key: "celery", label: "Céleri", emoji: "🥬" },
  { key: "mustard", label: "Moutarde", emoji: "🟡" },
  { key: "sesame", label: "Sésame", emoji: "⚪" },
  { key: "sulphites", label: "Sulfites", emoji: "🍷" },
  { key: "lupin", label: "Lupin", emoji: "🌻" },
  { key: "molluscs", label: "Mollusques", emoji: "🦪" },
];

// ─── Labels / régimes alimentaires ────────────────────────────────────────────

export type LabelKey =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "organic"
  | "homemade"
  | "label_rouge"
  | "aop"
  | "halal"
  | "kosher"
  | "spicy"
  | "very_spicy"
  | "low_calorie"
  | "raw";

export const LABELS: { key: LabelKey; label: string; emoji: string; color: string }[] = [
  {
    key: "vegetarian",
    label: "Végétarien",
    emoji: "🌿",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    key: "vegan",
    label: "Vegan",
    emoji: "🌱",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    key: "gluten_free",
    label: "Sans gluten",
    emoji: "🚫",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  {
    key: "organic",
    label: "Bio",
    emoji: "♻️",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  {
    key: "homemade",
    label: "Fait maison",
    emoji: "🏠",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  {
    key: "label_rouge",
    label: "Label Rouge",
    emoji: "🔴",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  {
    key: "aop",
    label: "AOP/AOC/IGP",
    emoji: "🏷️",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  { key: "halal", label: "Halal", emoji: "☪️", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  {
    key: "kosher",
    label: "Kasher",
    emoji: "✡️",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  },
  { key: "spicy", label: "Épicé", emoji: "🌶️", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  {
    key: "very_spicy",
    label: "Très épicé",
    emoji: "🔥",
    color: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
  },
  {
    key: "low_calorie",
    label: "Basses calories",
    emoji: "⚖️",
    color: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  },
  { key: "raw", label: "Cru", emoji: "🥗", color: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200" },
];

// ─── Types de produit ─────────────────────────────────────────────────────────

export type ProductTypeKey = "recipe" | "ingredient" | "purchased";

export const PRODUCT_TYPES: { key: ProductTypeKey; label: string; emoji: string; description: string }[] = [
  {
    key: "recipe",
    label: "Recette",
    emoji: "🍽️",
    description: "Produit vendu au client, composé d'ingrédients (plat, dessert cuisiné…)",
  },
  {
    key: "purchased",
    label: "Achat direct",
    emoji: "🛒",
    description: "Produit acheté et revendu tel quel, sans transformation (boissons, articles packagés…)",
  },
  {
    key: "ingredient",
    label: "Ingrédient",
    emoji: "🧄",
    description: "Matière première achetée fournisseur, utilisée dans les recettes, jamais vendue seule",
  },
];

// ─── Comportements par type de produit ───────────────────────────────────────

export type ProductTypeBehavior = {
  /** Visible dans la grille tactile du POS caisse */
  showInPOS: boolean;
  /** Vendu directement au client (a un prix dans les menus) */
  isForSale: boolean;
  /** Peut être utilisé comme composant dans une recette */
  canBeRecipeComponent: boolean;
  /** Le prix d'achat HT est particulièrement important (calcul de coût) */
  requiresPurchasePrice: boolean;
};

export const PRODUCT_TYPE_BEHAVIORS: Record<ProductTypeKey, ProductTypeBehavior> = {
  recipe: { showInPOS: true, isForSale: true, canBeRecipeComponent: false, requiresPurchasePrice: false },
  purchased: { showInPOS: true, isForSale: true, canBeRecipeComponent: true, requiresPurchasePrice: true },
  ingredient: { showInPOS: false, isForSale: false, canBeRecipeComponent: true, requiresPurchasePrice: true },
};

/**
 * Fusionne les comportements de plusieurs types (logique OR).
 * Un produit avec types ["dish","ingredient"] sera showInPOS=true ET canBeRecipeComponent=true.
 */
export function resolveProductBehaviors(types: string[]): ProductTypeBehavior {
  const defaults: ProductTypeBehavior = {
    showInPOS: false,
    isForSale: false,
    canBeRecipeComponent: false,
    requiresPurchasePrice: false,
  };
  if (!types.length) return defaults;
  return types.reduce((acc, key) => {
    const b = PRODUCT_TYPE_BEHAVIORS[key as ProductTypeKey];
    if (!b) return acc;
    return {
      showInPOS: acc.showInPOS || b.showInPOS,
      isForSale: acc.isForSale || b.isForSale,
      canBeRecipeComponent: acc.canBeRecipeComponent || b.canBeRecipeComponent,
      requiresPurchasePrice: acc.requiresPurchasePrice || b.requiresPurchasePrice,
    };
  }, defaults);
}

// ─── Unités de portion ────────────────────────────────────────────────────────

export const PORTION_UNITS = ["g", "kg", "ml", "cl", "l", "piece"] as const;
export type PortionUnit = (typeof PORTION_UNITS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAllergenLabel(key: string): string {
  return ALLERGENS.find((a) => a.key === key)?.label ?? key;
}

export function getLabelConfig(key: string) {
  return LABELS.find((l) => l.key === key);
}

export function getProductTypeLabel(key: string): string {
  return PRODUCT_TYPES.find((t) => t.key === key)?.label ?? key;
}
