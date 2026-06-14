export interface CrmProduct {
  id: string;
  name: string;
  description: string | null;
  category: "software" | "hardware" | "service" | "other";
  unit_price: number;
  price_type: "monthly" | "one_time";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "software", label: "Logiciel", color: "bg-blue-100 text-blue-700" },
  { value: "hardware", label: "Matériel", color: "bg-gray-100 text-gray-700" },
  { value: "service", label: "Service", color: "bg-green-100 text-green-700" },
  { value: "other", label: "Autre", color: "bg-slate-100 text-slate-600" },
];

export const PRICE_TYPES: { value: string; label: string; suffix: string }[] = [
  { value: "monthly", label: "Mensuel", suffix: "/mois" },
  { value: "one_time", label: "Unique", suffix: "" },
];

export function getCategoryConfig(category: string) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[3];
}

export function getPriceTypeSuffix(type: string) {
  return PRICE_TYPES.find((p) => p.value === type)?.suffix ?? "";
}
