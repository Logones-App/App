import { getAllergenLabel, getLabelConfig, getProductTypeLabel } from "@/lib/constants/product-attributes";
import type { Tables } from "@/lib/supabase/database.types";

type ProductRow = Tables<"products">;

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function exportProductsToCSV(
  products: ProductRow[],
  _categoryById?: Map<string, string>,
  filename = "produits.csv",
) {
  const headers = [
    "Nom",
    "Catégorie",
    "Description",
    "Type",
    "SKU",
    "Disponible",
    "Allergènes",
    "Labels",
    "Poids/volume portion",
    "Unité portion",
    "Food cost cible (%)",
    "Ordre affichage",
  ];

  const rows = products.map((p) => {
    const allergens = (p.allergens as string[] | null) ?? [];
    const labels = (p.labels as string[] | null) ?? [];
    const allergenLabels = allergens.map(getAllergenLabel).join("; ");
    const labelsList = labels.map((k) => getLabelConfig(k)?.label ?? k).join("; ");
    const types = (p.product_type as string[] | null) ?? [];
    const typeLabel = types.map(getProductTypeLabel).join(", ");
    const foodCostPct = p.food_cost_target != null ? String(Math.round(p.food_cost_target * 100)) : "";

    return csvRow([
      p.name,
      (p.category_id ? _categoryById?.get(p.category_id) : null) ?? "",
      p.description ?? "",
      typeLabel,
      p.sku ?? "",
      p.is_available ? "Oui" : "Non",
      allergenLabels,
      labelsList,
      p.portion_weight ?? "",
      p.portion_unit ?? "",
      foodCostPct,
      p.display_order ?? "",
    ]);
  });

  const bom = "﻿"; // UTF-8 BOM pour Excel
  const csv = bom + [csvRow(headers), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
