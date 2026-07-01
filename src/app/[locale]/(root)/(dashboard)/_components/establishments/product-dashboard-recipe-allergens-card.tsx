"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllergenBadges } from "@/components/ui/product-attribute-pickers";
import { COUNTRIES } from "@/lib/constants/countries";
import { ALLERGENS } from "@/lib/constants/product-attributes";
import { useEstablishmentRecipeEdges, type RecipeEdge } from "@/lib/queries/recipe-graph-queries";
import { useSupplierReferenceAttributes } from "@/lib/queries/supplier-queries";

type NodeAttr = { name: string; allergens: unknown; origins: unknown };
type RefRow = { product_id: string; allergens: unknown; origins: unknown };

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}
function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
function allergenLabel(key: string): string {
  return ALLERGENS.find((a) => a.key === key)?.label ?? key;
}

/** Tous les descendants (transitifs) d'une recette dans le graphe BOM, hors la recette elle-même. */
function collectDescendants(rootId: string, adjacency: Map<string, string[]>): string[] {
  const found = new Set<string>();
  const visited = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const child of adjacency.get(cur) ?? []) {
      found.add(child);
      if (!visited.has(child)) {
        visited.add(child);
        stack.push(child);
      }
    }
  }
  return Array.from(found);
}

function buildAdjacency(edges: RecipeEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    const list = m.get(e.main_product_id) ?? [];
    list.push(e.component_product_id);
    m.set(e.main_product_id, list);
  }
  return m;
}

type Aggregation = {
  allergens: string[];
  origins: string[];
  sources: { key: string; label: string; ingredients: string[] }[];
};

/** Union allergènes/origine (recette + descendants + leurs références) + traçabilité par allergène. */
function buildAggregation(
  recipeAllergens: string[],
  recipeOrigins: string[],
  descendantIds: string[],
  productsById: Map<string, NodeAttr>,
  refAttrs: RefRow[],
): Aggregation {
  const allergens = new Set<string>(recipeAllergens);
  const origins = new Set<string>(recipeOrigins);
  const sourcesByAllergen = new Map<string, Set<string>>();
  const addAllergen = (key: string, source: string) => {
    allergens.add(key);
    const set = sourcesByAllergen.get(key) ?? new Set<string>();
    set.add(source);
    sourcesByAllergen.set(key, set);
  };

  const refsByProduct = new Map<string, RefRow[]>();
  for (const r of refAttrs) {
    const list = refsByProduct.get(r.product_id) ?? [];
    list.push(r);
    refsByProduct.set(r.product_id, list);
  }

  for (const id of descendantIds) {
    const node = productsById.get(id);
    const name = node?.name ?? "Ingrédient";
    asStrings(node?.allergens).forEach((a) => addAllergen(a, name));
    asStrings(node?.origins).forEach((o) => origins.add(o));
    for (const r of refsByProduct.get(id) ?? []) {
      asStrings(r.allergens).forEach((a) => addAllergen(a, name));
      asStrings(r.origins).forEach((o) => origins.add(o));
    }
  }

  const sources = Array.from(allergens)
    .filter((key) => sourcesByAllergen.has(key))
    .map((key) => ({ key, label: allergenLabel(key), ingredients: Array.from(sourcesByAllergen.get(key) ?? []) }));

  return { allergens: Array.from(allergens), origins: Array.from(origins), sources };
}

export function RecipeAllergensCard({
  recipeProductId,
  recipeAllergens,
  recipeOrigins,
  establishmentId,
  organizationId,
  productsById,
}: {
  recipeProductId: string;
  recipeAllergens: unknown;
  recipeOrigins: unknown;
  establishmentId: string;
  organizationId: string;
  productsById: Map<string, NodeAttr>;
}) {
  const { data: edges = [] } = useEstablishmentRecipeEdges(establishmentId, organizationId);
  const descendantIds = collectDescendants(recipeProductId, buildAdjacency(edges));
  const { data: refAttrs = [] } = useSupplierReferenceAttributes(descendantIds);
  const agg = buildAggregation(
    asStrings(recipeAllergens),
    asStrings(recipeOrigins),
    descendantIds,
    productsById,
    refAttrs,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allergènes &amp; origine de la recette</CardTitle>
        <CardDescription>
          Agrégés automatiquement depuis la recette, ses ingrédients (y compris préparations imbriquées) et leurs
          références fournisseurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Allergènes</p>
          {agg.allergens.length > 0 ? (
            <AllergenBadges allergens={agg.allergens} />
          ) : (
            <p className="text-muted-foreground text-sm">Aucun allergène déclaré.</p>
          )}
          {agg.sources.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {agg.sources.map((s) => (
                <p key={s.key} className="text-muted-foreground text-[11px]">
                  <span className="font-medium">{s.label}</span> — {s.ingredients.join(", ")}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Origine</p>
          {agg.origins.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {agg.origins.map((c) => (
                <Badge key={c} variant="secondary">
                  {countryName(c)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Origine non renseignée.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
