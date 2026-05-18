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

export type ProductTypeKey = "dish" | "drink" | "dessert" | "starter" | "ingredient" | "supplement" | "menu_item";

export const PRODUCT_TYPES: { key: ProductTypeKey; label: string; emoji: string }[] = [
  { key: "dish", label: "Plat", emoji: "🍽️" },
  { key: "starter", label: "Entrée", emoji: "🥗" },
  { key: "dessert", label: "Dessert", emoji: "🍰" },
  { key: "drink", label: "Boisson", emoji: "🥤" },
  { key: "ingredient", label: "Ingrédient", emoji: "🧄" },
  { key: "supplement", label: "Supplément", emoji: "➕" },
  { key: "menu_item", label: "Élément de menu", emoji: "📋" },
];

// ─── Unités de portion ────────────────────────────────────────────────────────

export const PORTION_UNITS = [
  { key: "g", label: "g (grammes)" },
  { key: "kg", label: "kg" },
  { key: "ml", label: "ml (millilitres)" },
  { key: "cl", label: "cl" },
  { key: "l", label: "L (litres)" },
  { key: "piece", label: "pièce" },
  { key: "portion", label: "portion" },
];

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
