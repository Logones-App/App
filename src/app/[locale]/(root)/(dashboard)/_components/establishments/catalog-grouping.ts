// Regroupement de la vue LISTE du catalogue (C5) : « matière + ses formats de vente ».
// Logique pure (testable, hors composant) pour respecter les limites ESLint.

import type { Tables } from "@/lib/supabase/database.types";

type ProductRow = Tables<"products">;
export type RecipeEdge = { main_product_id: string; component_product_id: string };

export type CatalogEntry =
  | { kind: "product"; product: ProductRow }
  | { kind: "matiere"; matiere: ProductRow; formats: ProductRow[] };

export type CatalogSection = {
  key: "matieres" | "produits" | "autres";
  label: string;
  emoji: string;
  entries: CatalogEntry[];
  /** Nombre total de produits (parents + formats + lignes) — pour le badge. */
  count: number;
};

export const CATALOG_SECTION_KEYS = ["matieres", "produits", "autres"] as const;

function types(p: ProductRow): string[] {
  return (p.product_type as string[] | null) ?? [];
}
const isIngredient = (p: ProductRow) => types(p).includes("ingredient");
const isSellable = (p: ProductRow) => types(p).includes("sellable");
const byName = (a: ProductRow, b: ProductRow) => a.name.localeCompare(b.name, "fr");

/**
 * Construit les 3 sections du catalogue :
 * - « Matières & formats » : chaque matière (ingredient) source unique d'un ou plusieurs formats vendables,
 *   avec ses formats imbriqués.
 * - « Produits » : produits vendables autonomes (plat composite multi-ingrédients ou revente sèche sans BOM).
 * - « Autres » : le reste non vendu / sans format (matières nues, préparations non vendues).
 *
 * Règle « format » : un produit `sellable` dont le BOM ne consomme **qu'une seule** matière (mono-source)
 * est un format de cette matière. Sinon il est autonome.
 */
export function buildCatalogSections(products: ProductRow[], edges: RecipeEdge[]): CatalogSection[] {
  const byId = new Map(products.map((p) => [p.id, p]));

  // Composants distincts par produit-parent (limités au catalogue courant).
  const compsByMain = new Map<string, Set<string>>();
  for (const e of edges) {
    if (e.main_product_id === e.component_product_id) continue;
    const set = compsByMain.get(e.main_product_id) ?? new Set<string>();
    set.add(e.component_product_id);
    compsByMain.set(e.main_product_id, set);
  }

  // formatOf : id du format → id de sa matière source (mono-source, composant = ingrédient).
  const formatOf = new Map<string, string>();
  for (const p of products) {
    if (!isSellable(p)) continue;
    const comps = [...(compsByMain.get(p.id) ?? [])].filter((cid) => byId.has(cid));
    if (comps.length !== 1) continue;
    const matiere = byId.get(comps[0]);
    if (matiere && isIngredient(matiere)) formatOf.set(p.id, matiere.id);
  }

  const parentIds = new Set([...formatOf.values()]);
  // Un parent qui serait lui-même un format d'une autre matière reste affiché comme parent.
  for (const fid of [...formatOf.keys()]) {
    if (parentIds.has(fid)) formatOf.delete(fid);
  }

  const formatsByParent = new Map<string, ProductRow[]>();
  for (const [fid, mid] of formatOf) {
    const arr = formatsByParent.get(mid) ?? [];
    const fmt = byId.get(fid);
    if (fmt) arr.push(fmt);
    formatsByParent.set(mid, arr);
  }

  const nestedFormatIds = new Set(formatOf.keys());
  const placed = new Set<string>([...parentIds, ...nestedFormatIds]);

  const matiereEntries: CatalogEntry[] = [...parentIds]
    .map((mid) => byId.get(mid))
    .filter((m): m is ProductRow => !!m)
    .sort(byName)
    .map((matiere) => ({
      kind: "matiere" as const,
      matiere,
      formats: (formatsByParent.get(matiere.id) ?? []).sort(byName),
    }));

  const autonomous = products.filter((p) => isSellable(p) && !placed.has(p.id));
  autonomous.forEach((p) => placed.add(p.id));
  const others = products.filter((p) => !placed.has(p.id));

  const countMatieres = matiereEntries.reduce((n, e) => n + (e.kind === "matiere" ? 1 + e.formats.length : 1), 0);

  const sections: CatalogSection[] = [
    { key: "matieres", label: "Matières & formats", emoji: "🍶", entries: matiereEntries, count: countMatieres },
    {
      key: "produits",
      label: "Produits",
      emoji: "🍽️",
      entries: autonomous.sort(byName).map((product) => ({ kind: "product" as const, product })),
      count: autonomous.length,
    },
    {
      key: "autres",
      label: "Ingrédients & préparations",
      emoji: "📦",
      entries: others.sort(byName).map((product) => ({ kind: "product" as const, product })),
      count: others.length,
    },
  ];

  return sections.filter((s) => s.entries.length > 0);
}

/** Filtre les sections par recherche texte (nom/description), en conservant l'imbrication matière→formats. */
export function filterCatalogSections(sections: CatalogSection[], query: string): CatalogSection[] {
  const t = query.trim().toLowerCase();
  if (!t) return sections;
  const match = (p: ProductRow) => p.name.toLowerCase().includes(t) || (p.description ?? "").toLowerCase().includes(t);

  const out: CatalogSection[] = [];
  for (const s of sections) {
    const entries: CatalogEntry[] = [];
    for (const e of s.entries) {
      if (e.kind === "product") {
        if (match(e.product)) entries.push(e);
        continue;
      }
      const matiereHit = match(e.matiere);
      const formats = matiereHit ? e.formats : e.formats.filter(match);
      if (matiereHit || formats.length > 0) entries.push({ kind: "matiere", matiere: e.matiere, formats });
    }
    if (entries.length > 0) {
      const count = entries.reduce((n, e) => n + (e.kind === "matiere" ? 1 + e.formats.length : 1), 0);
      out.push({ ...s, entries, count });
    }
  }
  return out;
}
