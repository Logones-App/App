// Logique pure du générateur de déclinaisons : suggestions depuis les références,
// estimation de coût, et validation. Séparé du composant pour respecter les limites ESLint.

export type RefLike = {
  packaging: string | null;
  conversion_factor: number;
  unit_price: number | null;
};

/** Coût par unité de stock estimé depuis les références (min des unit_price / conversion_factor). */
export function estimateUnitCost(refs: RefLike[]): number | null {
  const costs = refs
    .map((r) => (r.unit_price != null && r.conversion_factor > 0 ? r.unit_price / r.conversion_factor : null))
    .filter((c): c is number => c != null && Number.isFinite(c) && c > 0);
  return costs.length > 0 ? Math.min(...costs) : null;
}

export type DeclinationSuggestion = {
  key: string; // clé stable (packaging + quantité)
  label: string; // « À la bouteille »
  qty: number; // contenance, en unité de stock
  packaging: string;
};

/**
 * Suggestions « conditionnement plein » depuis les références : 1 déclinaison par
 * conditionnement distinct (dédoublonnage), quantité = conversion_factor (unités de stock).
 * Le vrac (packaging null) n'a pas de format vendable « plein » → ignoré.
 */
export function suggestionsFromRefs(refs: RefLike[]): DeclinationSuggestion[] {
  const seen = new Set<string>();
  const out: DeclinationSuggestion[] = [];
  for (const r of refs) {
    const pkg = r.packaging;
    const qty = r.conversion_factor;
    if (!pkg || !(qty > 0)) continue;
    const key = `${pkg}:${qty}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = pkg === "piece" ? "pièce" : pkg.toLowerCase();
    out.push({ key, label: `À la ${name}`, qty, packaging: pkg });
  }
  return out;
}

export type Draft = {
  id: string; // id local (React)
  name: string;
  qtyStr: string; // quantité consommée (unité de stock)
  priceStr: string; // prix de vente (optionnel)
  enabled: boolean;
};

export function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Coût matière d'une déclinaison = quantité × coût unitaire (null si inconnu). */
export function draftCost(qtyStr: string, unitCost: number | null): number | null {
  const qty = parsePositive(qtyStr);
  if (qty == null || unitCost == null) return null;
  return Math.round(qty * unitCost * 10000) / 10000;
}

/** Une déclinaison est créable si activée, nommée et avec une quantité > 0. */
export function isDraftValid(d: Draft): boolean {
  return d.enabled && d.name.trim() !== "" && parsePositive(d.qtyStr) != null;
}

/** Au moins une déclinaison valide requise pour lancer la création. */
export function canGenerate(drafts: Draft[]): boolean {
  return drafts.some(isDraftValid);
}
