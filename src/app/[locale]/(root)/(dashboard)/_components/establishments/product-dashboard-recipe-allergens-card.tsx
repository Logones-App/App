"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllergenBadges } from "@/components/ui/product-attribute-pickers";
import { COUNTRIES } from "@/lib/constants/countries";
import { useSupplierReferenceAttributes } from "@/lib/queries/supplier-queries";

type AttrRow = { allergens: unknown; origins: unknown };

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Agrège (union) allergènes + origine d'une recette : ce qui est saisi sur la recette,
 * sur ses ingrédients (produits) et sur les références fournisseurs de ces ingrédients.
 * v1 : ingrédients directs. (Récursion préparations imbriquées : à ajouter.)
 */
function aggregate(
  recipeAllergens: string[],
  recipeOrigins: string[],
  componentIds: string[],
  productsById: Map<string, AttrRow>,
  refAttrs: AttrRow[],
): { allergens: string[]; origins: string[] } {
  const allergens = new Set<string>(recipeAllergens);
  const origins = new Set<string>(recipeOrigins);
  for (const id of componentIds) {
    const p = productsById.get(id);
    asStrings(p?.allergens).forEach((a) => allergens.add(a));
    asStrings(p?.origins).forEach((o) => origins.add(o));
  }
  for (const r of refAttrs) {
    asStrings(r.allergens).forEach((a) => allergens.add(a));
    asStrings(r.origins).forEach((o) => origins.add(o));
  }
  return { allergens: Array.from(allergens), origins: Array.from(origins) };
}

export function RecipeAllergensCard({
  recipeAllergens,
  recipeOrigins,
  componentIds,
  productsById,
}: {
  recipeAllergens: unknown;
  recipeOrigins: unknown;
  componentIds: string[];
  productsById: Map<string, AttrRow>;
}) {
  const { data: refAttrs = [] } = useSupplierReferenceAttributes(componentIds);
  const { allergens, origins } = aggregate(
    asStrings(recipeAllergens),
    asStrings(recipeOrigins),
    componentIds,
    productsById,
    refAttrs,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allergènes &amp; origine de la recette</CardTitle>
        <CardDescription>
          Agrégés automatiquement depuis la recette, ses ingrédients et leurs références fournisseurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Allergènes</p>
          {allergens.length > 0 ? (
            <AllergenBadges allergens={allergens} />
          ) : (
            <p className="text-muted-foreground text-sm">Aucun allergène déclaré.</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Origine</p>
          {origins.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {origins.map((c) => (
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
