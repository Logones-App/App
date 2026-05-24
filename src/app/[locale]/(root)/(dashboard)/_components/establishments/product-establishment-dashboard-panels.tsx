"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CompositionStockRow,
  MenuProductPricingJoin,
  ProductCompositionRow,
  ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import type { Tables } from "@/lib/supabase/database.types";

import { ProductFicheTechniquePanel } from "./product-dashboard-fiche-technique-panel";
import { ProductFournisseursPrixPanel } from "./product-dashboard-fournisseurs-prix-panel";
import { ProductOptionsAndCompositionsPanel } from "./product-dashboard-options-compositions-panel";
import { PrixPanel } from "./product-dashboard-prix-panel";
import { ProductProprieteForm } from "./product-dashboard-propriete-form";
import { ProductStockPanel } from "./product-dashboard-stock-panel";

type TabsProps = {
  product: ProductWithCategoryName;
  establishmentId: string;
  organizationId: string;
  backHref: string;
  options: Tables<"product_options">[];
  compositions: ProductCompositionRow[];
  compositionStockRows: CompositionStockRow[];
  menuProductPricing: MenuProductPricingJoin[];
};

export function ProductEstablishmentDashboardTabs({
  product,
  establishmentId,
  organizationId,
  backHref,
  options,
  compositions,
  compositionStockRows,
  menuProductPricing,
}: TabsProps) {
  const types = (product.product_type as string[] | null) ?? [];
  const isIngredientOnly = types.includes("ingredient") && !types.includes("recipe");
  const hasIngredientType = types.includes("ingredient");
  const portionUnit = product.portion_unit ?? null;

  // Compositions pertinentes pour Personnalisation : self + modifier uniquement (pas recette)
  const persoStockRows = compositionStockRows.filter(
    (r) => r.isSelfComposition || r.composition.composition_kind === "modifier",
  );
  const persoCount = options.length + persoStockRows.length;

  return (
    <Tabs defaultValue="propriete" className="w-full gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
        <TabsTrigger value="propriete">Propriété</TabsTrigger>
        {!isIngredientOnly && <TabsTrigger value="prix">Prix de vente</TabsTrigger>}
        {!isIngredientOnly && <TabsTrigger value="personnalisation">Personnalisation ({persoCount})</TabsTrigger>}
        <TabsTrigger value="stock">Stock</TabsTrigger>
        {!isIngredientOnly && <TabsTrigger value="fiche">Fiche technique</TabsTrigger>}
        {hasIngredientType && <TabsTrigger value="fournisseurs">Fournisseurs &amp; Prix</TabsTrigger>}
      </TabsList>

      <TabsContent value="propriete">
        <ProductProprieteForm
          product={product}
          productId={product.id}
          organizationId={organizationId}
          establishmentId={establishmentId}
          backHref={backHref}
        />
      </TabsContent>

      {!isIngredientOnly && (
        <TabsContent value="prix">
          <PrixPanel
            product={product}
            productId={product.id}
            establishmentId={establishmentId}
            organizationId={organizationId}
            menuProductPricing={menuProductPricing}
          />
        </TabsContent>
      )}

      {!isIngredientOnly && (
        <TabsContent value="personnalisation">
          <ProductOptionsAndCompositionsPanel
            options={options}
            compositionStockRows={persoStockRows}
            productId={product.id}
            establishmentId={establishmentId}
            organizationId={organizationId}
          />
        </TabsContent>
      )}

      <TabsContent value="stock">
        <ProductStockPanel
          compositionStockRows={compositionStockRows}
          productId={product.id}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      </TabsContent>

      {!isIngredientOnly && (
        <TabsContent value="fiche">
          <ProductFicheTechniquePanel
            product={product}
            compositions={compositions}
            establishmentId={establishmentId}
            organizationId={organizationId}
            menuProductPricing={menuProductPricing}
          />
        </TabsContent>
      )}

      {hasIngredientType && (
        <TabsContent value="fournisseurs">
          <ProductFournisseursPrixPanel
            productId={product.id}
            organizationId={organizationId}
            portionUnit={portionUnit}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
