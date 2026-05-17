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
import { ProductOptionsAndCompositionsPanel } from "./product-dashboard-options-compositions-panel";
import { PrixPanel } from "./product-dashboard-prix-panel";
import { ProductProprieteForm } from "./product-dashboard-propriete-form";
import { ProductStockPanel } from "./product-dashboard-stock-panel";

type TabsProps = {
  product: ProductWithCategoryName;
  productId: string;
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
  productId,
  establishmentId,
  organizationId,
  backHref,
  options,
  compositions,
  compositionStockRows,
  menuProductPricing,
}: TabsProps) {
  const persoCount = options.length + compositionStockRows.length;

  return (
    <Tabs defaultValue="propriete" className="w-full gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
        <TabsTrigger value="propriete">Propriété</TabsTrigger>
        <TabsTrigger value="prix">Prix</TabsTrigger>
        <TabsTrigger value="personnalisation">Personnalisation ({persoCount})</TabsTrigger>
        <TabsTrigger value="stock">Stock</TabsTrigger>
        <TabsTrigger value="fiche">Fiche technique</TabsTrigger>
      </TabsList>

      <TabsContent value="propriete">
        <ProductProprieteForm
          product={product}
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId}
          backHref={backHref}
        />
      </TabsContent>

      <TabsContent value="prix">
        <PrixPanel
          product={product}
          productId={productId}
          establishmentId={establishmentId}
          organizationId={organizationId}
          menuProductPricing={menuProductPricing}
        />
      </TabsContent>

      <TabsContent value="personnalisation">
        <ProductOptionsAndCompositionsPanel
          options={options}
          compositionStockRows={compositionStockRows}
          productId={productId}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      </TabsContent>

      <TabsContent value="stock">
        <ProductStockPanel
          compositionStockRows={compositionStockRows}
          productId={productId}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      </TabsContent>

      <TabsContent value="fiche">
        <ProductFicheTechniquePanel product={product} compositions={compositions} />
      </TabsContent>
    </Tabs>
  );
}
