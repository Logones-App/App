const UNIT_FACTORS: Partial<Record<string, number>> = {
  g_kg: 0.001,
  kg_g: 1000,
  ml_cl: 0.1,
  cl_ml: 10,
  ml_l: 0.001,
  l_ml: 1000,
  cl_l: 0.01,
  l_cl: 100,
};

export type UnitCategory = "mass" | "volume" | "unit";

export function unitCategory(unit: string | null | undefined): UnitCategory | null {
  if (!unit) return null;
  if (unit === "g" || unit === "kg") return "mass";
  if (unit === "ml" || unit === "cl" || unit === "l") return "volume";
  if (unit === "piece") return "unit";
  return null;
}

export function areUnitsCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true;
  if (a === b) return true;
  const ca = unitCategory(a);
  const cb = unitCategory(b);
  return ca !== null && cb !== null && ca === cb;
}

export function compatibleUnits(
  referenceUnit: string | null | undefined,
  allUnits: readonly string[],
): readonly string[] {
  if (!referenceUnit) return allUnits;
  const cat = unitCategory(referenceUnit);
  if (!cat) return allUnits;
  return allUnits.filter((u) => unitCategory(u) === cat);
}

/**
 * Normalise un prix par orderUnit vers portionUnit (pour stocker unit_cost).
 * qtyPerOrder n'est PAS un facteur de prix — c'est une taille de colis, purement informatif.
 */
export function normalizeUnitPrice(price: number, orderUnit: string | null, portionUnit: string | null): number {
  if (!orderUnit || !portionUnit || orderUnit === portionUnit) return price;
  const factor = convertUnit(1, orderUnit, portionUnit);
  if (factor == null) return price;
  return Math.round((price / factor) * 10000) / 10000;
}

/**
 * Convertit un coût normalisé (par portionUnit) vers une unité lisible pour l'affichage.
 * g → kg, ml → l, cl → l, tout le reste inchangé.
 */
export function toFriendlyUnitCost(cost: number, unit: string | null): { value: number; displayUnit: string } {
  if (unit === "g") return { value: Math.round(cost * 1000 * 10000) / 10000, displayUnit: "kg" };
  if (unit === "ml") return { value: Math.round(cost * 1000 * 10000) / 10000, displayUnit: "l" };
  if (unit === "cl") return { value: Math.round(cost * 100 * 10000) / 10000, displayUnit: "l" };
  return { value: cost, displayUnit: unit ?? "" };
}

/**
 * Convertit `value` de l'unité `from` vers l'unité `to`.
 * Retourne `null` si la conversion est impossible (unités incompatibles ou inconnues).
 * Retourne `value` directement si les unités sont identiques.
 */
export function convertUnit(
  value: number,
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  if (!from || !to) return value;
  if (from === to) return value;
  const key = `${from.toLowerCase()}_${to.toLowerCase()}`;
  // eslint-disable-next-line security/detect-object-injection
  const factor = UNIT_FACTORS[key] ?? null;
  return factor != null ? value * factor : null;
}

// ─── Réception (modèle unique : conversion_factor = unités de stock par unité de commande) ──

/**
 * Convertit une quantité commandée (order_unit) en quantité de stock.
 * `conversion_factor` = nb d'unités de stock contenues dans 1 unité de commande
 * (ex : 1 sac = 5 kg → 5). Source de vérité unique pour toute réception.
 */
export function orderQtyToStockQty(orderQty: number, conversionFactor: number | null | undefined): number {
  const f = conversionFactor != null && conversionFactor > 0 ? conversionFactor : 1;
  return Math.round(orderQty * f * 1000) / 1000;
}

/**
 * Coût FIFO par unité de stock à partir du prix total HT d'une ligne de réception.
 * Retourne `null` si la quantité de stock est nulle ou négative.
 */
export function unitCostFromTotal(totalHT: number, stockQty: number): number | null {
  if (!(stockQty > 0)) return null;
  return Math.round((totalHT / stockQty) * 100000) / 100000;
}

/**
 * Suggestion de contenance (unités de stock par unité de commande) pour pré-remplir
 * le formulaire catalogue quand les unités sont dimensionnellement liées (kg→g = 1000).
 * Retourne `null` si aucune conversion dimensionnelle n'existe.
 */
export function suggestConversionFactor(
  orderUnit: string | null | undefined,
  stockUnit: string | null | undefined,
): number | null {
  const dim = convertUnit(1, orderUnit, stockUnit);
  return dim != null && dim > 0 ? dim : null;
}

/**
 * Convertit une quantité de recette (`qty` exprimée dans `qtyUnit`) vers l'unité `targetUnit`
 * du composant — unité de stock d'une matière feuille, OU unité de rendement d'une sous-recette.
 * Primitive partagée (coût récursif SaaS + aplatissement du décrément mobile).
 * - Conversion dimensionnelle si compatible (`convertUnit`).
 * - Sinon pont via `conversionFactor` = « 1 targetUnit = X qtyUnit » → `qty / conversionFactor`
 *   (ex. 1 pièce = 450 g → 112 g / 450 = 0,249 pièce). Renseigné seulement si unités incompatibles.
 * Retourne `null` si aucune conversion possible (→ à traiter en `needs_review` côté vente).
 */
export function toComponentQty(
  qty: number,
  qtyUnit: string | null | undefined,
  targetUnit: string | null | undefined,
  conversionFactor?: number | null,
): number | null {
  const converted = convertUnit(qty, qtyUnit, targetUnit);
  if (converted != null) return converted;
  if (conversionFactor != null && conversionFactor > 0) return qty / conversionFactor;
  return null;
}

/**
 * Calcule le coût HT d'une ligne de composition.
 * - `qty` : quantité utilisée dans la recette (avec son unité `qtyUnit`)
 * - `unitCost` : coût par `ingredientUnit` de l'ingrédient
 * - `conversionFactor` = « 1 [ingredientUnit] = X [qtyUnit] » (pont si unités incompatibles)
 * Retourne `null` si le coût ou la conversion sont impossibles.
 */
export function compositionLineCost(
  qty: number | null,
  qtyUnit: string | null | undefined,
  unitCost: number | null | undefined,
  ingredientUnit: string | null | undefined,
  conversionFactor?: number | null,
): number | null {
  if (qty == null || !unitCost) return null;
  const q = toComponentQty(qty, qtyUnit, ingredientUnit, conversionFactor);
  return q != null ? Math.round(q * unitCost * 10000) / 10000 : null;
}
