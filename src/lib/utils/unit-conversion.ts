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

/**
 * Calcule le coût HT d'une ligne de composition.
 * - `qty` : quantité utilisée dans la recette (avec son unité `qtyUnit`)
 * - `unitCost` : coût par `ingredientUnit` de l'ingrédient
 * Retourne `null` si le coût ou la conversion sont impossibles.
 */
export function compositionLineCost(
  qty: number | null,
  qtyUnit: string | null | undefined,
  unitCost: number | null | undefined,
  ingredientUnit: string | null | undefined,
): number | null {
  if (qty == null || !unitCost) return null;
  const converted = convertUnit(qty, qtyUnit, ingredientUnit);
  if (converted == null) return null;
  return Math.round(converted * unitCost * 10000) / 10000;
}
