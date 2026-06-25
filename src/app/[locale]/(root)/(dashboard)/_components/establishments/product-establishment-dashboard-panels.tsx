"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CompositionStockRow,
  MenuProductPricingJoin,
  ProductCompositionRow,
  ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";

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
  compositions: ProductCompositionRow[];
  compositionStockRows: CompositionStockRow[];
  menuProductPricing: MenuProductPricingJoin[];
};

export function ProductEstablishmentDashboardTabs({
  product,
  establishmentId,
  organizationId,
  backHref,
  compositions,
  compositionStockRows,
  menuProductPricing,
}: TabsProps) {
  const types = (product.product_type as string[] | null) ?? [];
  const isRecipe = types.includes("recipe");
  const isPurchased = types.includes("purchased");
  const isIngredient = types.includes("ingredient");
  // Produit vendu au client (peut avoir un prix dans les menus)
  const isForSale = isRecipe || isPurchased;
  // Affiche la fiche technique : recette, achat direct, ou ingrédient avec sous-recette
  const hasFicheTechnique = isRecipe || isPurchased || isIngredient;
  // Fournisseurs & Prix tab : seulement pour les ingrédients purs (jamais vendus)
  const hasFournisseursTab = isIngredient && !isForSale;
  const portionUnit = product.portion_unit ?? null;

  // Compositions pertinentes pour Personnalisation : self + modifier uniquement (pas recette)
  const persoStockRows = compositionStockRows.filter(
    (r) => r.isSelfComposition || r.composition.composition_kind === "modifier",
  );
  const persoCount = persoStockRows.length;

  const validTabs = [
    "propriete",
    "stock",
    ...(isForSale ? ["prix-menus", "personnalisation"] : []),
    ...(hasFicheTechnique ? ["recette"] : []),
    ...(hasFournisseursTab ? ["achats"] : []),
  ];

  const LS_KEY = "product-dashboard-active-tab";
  const [activeTab, setActiveTab] = useState("propriete");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved && validTabs.includes(saved)) setActiveTab(saved);
    } catch {
      // localStorage indisponible
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(LS_KEY, tab);
    } catch {
      // localStorage indisponible
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
        <TabsTrigger value="propriete">Propriété</TabsTrigger>
        {isForSale && <TabsTrigger value="prix-menus">Prix &amp; Menus</TabsTrigger>}
        {isForSale && <TabsTrigger value="personnalisation">Personnalisation ({persoCount})</TabsTrigger>}
        <TabsTrigger value="stock">Stock</TabsTrigger>
        {hasFicheTechnique && <TabsTrigger value="recette">Recette</TabsTrigger>}
        {hasFournisseursTab && <TabsTrigger value="achats">Achats</TabsTrigger>}
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

      {isForSale && (
        <TabsContent value="prix-menus">
          <PrixPanel menuProductPricing={menuProductPricing} />
        </TabsContent>
      )}

      {isForSale && (
        <TabsContent value="personnalisation">
          <ProductOptionsAndCompositionsPanel
            compositionStockRows={persoStockRows}
            productId={product.id}
            establishmentId={establishmentId}
            organizationId={organizationId}
          />
        </TabsContent>
      )}

      <TabsContent value="stock">
        <ProductStockPanel
          product={product}
          compositionStockRows={compositionStockRows}
          productId={product.id}
          establishmentId={establishmentId}
          organizationId={organizationId}
          isIngredient={isIngredient}
        />
      </TabsContent>

      {hasFicheTechnique && (
        <TabsContent value="recette">
          <ProductFicheTechniquePanel
            product={product}
            compositions={compositions}
            establishmentId={establishmentId}
            organizationId={organizationId}
            menuProductPricing={menuProductPricing}
          />
        </TabsContent>
      )}

      {hasFournisseursTab && (
        <TabsContent value="achats">
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
