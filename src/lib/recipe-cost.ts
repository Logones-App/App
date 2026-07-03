// Coût récursif d'une recette (une sous-recette peut être un composant d'une autre).
// Pur (pas de React) : la fiche technique assemble les données puis appelle ces fonctions.

import { compositionLineCost, toComponentQty } from "@/lib/utils/unit-conversion";

export type CompLine = {
  main_product_id: string;
  component_product_id: string;
  default_quantity: number | null;
  quantity_unit: string | null;
  conversion_factor: number | null;
};

export type ProductLike = {
  id: string;
  name: string;
  product_type: unknown;
  portion_unit: string | null;
  yield_quantity: number | null;
  yield_unit: string | null;
};

export type RecipeCostCtx = {
  byMain: Map<string, CompLine[]>; // BOM par produit principal
  matiereCost: Map<string, number>; // coût par portion_unit (FIFO/achat) d'une matière
  yieldQty: Map<string, number | null>;
  yieldUnit: Map<string, string | null>;
  portionUnit: Map<string, string | null>;
};

function typesOf(p: ProductLike): string[] {
  return Array.isArray(p.product_type) ? (p.product_type as string[]) : [];
}
export function isIngredientType(p: ProductLike): boolean {
  return typesOf(p).includes("ingredient");
}
export function isRecipeType(p: ProductLike): boolean {
  return typesOf(p).includes("recipe");
}

export function buildByMain(lines: CompLine[]): Map<string, CompLine[]> {
  const m = new Map<string, CompLine[]>();
  for (const l of lines) {
    const arr = m.get(l.main_product_id) ?? [];
    arr.push(l);
    m.set(l.main_product_id, arr);
  }
  return m;
}

export function buildCostCtx(
  products: ProductLike[],
  byMain: Map<string, CompLine[]>,
  matiereCost: Map<string, number>,
): RecipeCostCtx {
  const yieldQty = new Map<string, number | null>();
  const yieldUnit = new Map<string, string | null>();
  const portionUnit = new Map<string, string | null>();
  for (const p of products) {
    yieldQty.set(p.id, p.yield_quantity);
    yieldUnit.set(p.id, p.yield_unit);
    portionUnit.set(p.id, p.portion_unit);
  }
  return { byMain, matiereCost, yieldQty, yieldUnit, portionUnit };
}

function isRecipeNode(id: string, ctx: RecipeCostCtx): boolean {
  return (ctx.byMain.get(id)?.length ?? 0) > 0;
}

/** Coût unitaire d'un composant + l'unité dans laquelle il est exprimé (matière → portion_unit ; sous-recette → yield_unit). */
export function componentUnitCost(
  id: string,
  ctx: RecipeCostCtx,
  visited: Set<string>,
): { cost: number | null; unit: string | null } {
  if (isRecipeNode(id, ctx)) {
    const unit = ctx.yieldUnit.get(id) ?? ctx.portionUnit.get(id) ?? null;
    const y = ctx.yieldQty.get(id) ?? null;
    const batch = recipeBatchCost(id, ctx, visited);
    if (batch == null || y == null || y <= 0) return { cost: null, unit };
    return { cost: Math.round((batch / y) * 100000) / 100000, unit };
  }
  return { cost: ctx.matiereCost.get(id) ?? null, unit: ctx.portionUnit.get(id) ?? null };
}

/** Coût d'un LOT (une fournée = un rendement) d'une recette = Σ des lignes. null si aucune ligne calculable. */
export function recipeBatchCost(id: string, ctx: RecipeCostCtx, visited: Set<string>): number | null {
  if (visited.has(id)) return null; // garde-cycle
  const lines = ctx.byMain.get(id);
  if (!lines || lines.length === 0) return null;
  const next = new Set(visited).add(id);
  let sum = 0;
  let any = false;
  for (const line of lines) {
    const { cost, unit } = componentUnitCost(line.component_product_id, ctx, next);
    const lc = compositionLineCost(line.default_quantity, line.quantity_unit, cost, unit, line.conversion_factor);
    if (lc != null) {
      sum += lc;
      any = true;
    }
  }
  return any ? Math.round(sum * 10000) / 10000 : null;
}

/**
 * Aplatit le BOM de `id` vers ses feuilles (matières + sous-préparations STOCKÉES), en
 * quantités, pour la production. `factor` = nb de lots produits (1 = un rendement).
 * - Règle « feuille » IDENTIQUE au décrément mobile : un composant avec **stock propre suivi**
 *   (`hasStock`) est une feuille (on consomme son stock) ; sinon, s'il a un BOM → on développe
 *   (ratio q/yield) ; sinon feuille matière.
 * - Quantités converties via `toComponentQty` ; garde-cycle ; diamants sommés.
 * Écrit dans `out` : Map<feuilleProductId, quantité en unité de stock de la feuille>.
 */
export function flattenLeaves(
  id: string,
  ctx: RecipeCostCtx,
  factor: number,
  hasStock: Set<string>,
  visited: Set<string>,
  out: Map<string, number>,
): Map<string, number> {
  if (visited.has(id)) return out; // garde-cycle
  const lines = ctx.byMain.get(id);
  if (!lines || lines.length === 0) return out;
  const next = new Set(visited).add(id);
  for (const line of lines) {
    const comp = line.component_product_id;
    const expand = !hasStock.has(comp) && (ctx.byMain.get(comp)?.length ?? 0) > 0;
    if (expand) {
      const yU = ctx.yieldUnit.get(comp) ?? ctx.portionUnit.get(comp) ?? null;
      const q = toComponentQty(line.default_quantity ?? 0, line.quantity_unit, yU, line.conversion_factor);
      const y = ctx.yieldQty.get(comp) ?? null;
      if (q == null || y == null || y <= 0) continue;
      flattenLeaves(comp, ctx, factor * (q / y), hasStock, next, out);
    } else {
      // feuille : matière OU sous-préparation stockée → on consomme son stock (unité = portion_unit)
      const q = toComponentQty(
        line.default_quantity ?? 0,
        line.quantity_unit,
        ctx.portionUnit.get(comp) ?? null,
        line.conversion_factor,
      );
      if (q == null) continue;
      out.set(comp, (out.get(comp) ?? 0) + factor * q);
    }
  }
  return out;
}

/** Tous les composants atteignables depuis `rootId` (pour charger leurs coûts matière). Garde-cycle. */
export function collectReachable(rootId: string, byMain: Map<string, CompLine[]>): Set<string> {
  const seen = new Set<string>();
  const visited = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const l of byMain.get(cur) ?? []) {
      seen.add(l.component_product_id);
      stack.push(l.component_product_id);
    }
  }
  return seen;
}

/**
 * Ancêtres de `targetId` = nœuds qui peuvent l'atteindre. À exclure du sélecteur de composant :
 * ajouter l'un d'eux comme ingrédient de `targetId` créerait un cycle.
 */
export function computeAncestors(targetId: string, lines: CompLine[]): Set<string> {
  const rev = new Map<string, string[]>();
  for (const l of lines) {
    const arr = rev.get(l.component_product_id) ?? [];
    arr.push(l.main_product_id);
    rev.set(l.component_product_id, arr);
  }
  const anc = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const m of rev.get(cur) ?? []) {
      if (!anc.has(m)) {
        anc.add(m);
        stack.push(m);
      }
    }
  }
  return anc;
}

/** Candidats composant : ingrédients + sous-recettes (avec rendement), hors soi-même et hors ancêtres (anti-cycle). */
export function buildComponentCandidates(
  products: ProductLike[],
  selfId: string,
  ancestors: Set<string>,
): ProductLike[] {
  return products.filter((p) => {
    if (p.id === selfId || ancestors.has(p.id)) return false;
    if (isIngredientType(p)) return true;
    return isRecipeType(p) && p.yield_quantity != null && p.yield_quantity > 0;
  });
}

/** Unité de référence par candidat : unité de stock (ingrédient) sinon yield_unit (sous-recette). */
export function buildCandidateStockUnits(
  candidates: ProductLike[],
  stockUnits: Map<string, string> | undefined,
): Map<string, string> {
  const m = new Map<string, string>(stockUnits ?? new Map<string, string>());
  for (const p of candidates) {
    if (!m.has(p.id) && p.yield_unit) m.set(p.id, p.yield_unit);
  }
  return m;
}

/** Liste pour le sélecteur : la sous-recette expose son yield_unit comme portion_unit. */
export function buildPickerList(
  candidates: ProductLike[],
): { id: string; name: string; portion_unit: string | null }[] {
  return candidates.map((p) => ({ id: p.id, name: p.name, portion_unit: p.portion_unit ?? p.yield_unit }));
}
