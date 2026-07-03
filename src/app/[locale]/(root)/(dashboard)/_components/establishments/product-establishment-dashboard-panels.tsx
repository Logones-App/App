"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CompositionStockRow,
  MenuProductPricingJoin,
  ProductCompositionRow,
  ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";

import { AchatsGuidance } from "./product-dashboard-achats-guidance";
import { ProductFicheTechniquePanel } from "./product-dashboard-fiche-technique-panel";
import { ProductFournisseursPrixPanel } from "./product-dashboard-fournisseurs-prix-panel";
import { ProductOptionsAndCompositionsPanel } from "./product-dashboard-options-compositions-panel";
import { PrixPanel } from "./product-dashboard-prix-panel";
import { ProductProprieteForm } from "./product-dashboard-propriete-form";
import { PurchaseReceptionCard } from "./product-dashboard-reception-form";
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

type TabFlags = {
  isForSale: boolean;
  hasFicheTechnique: boolean;
  hasAchatsTab: boolean;
  isPureIngredient: boolean;
  portionUnit: string | null;
  persoStockRows: CompositionStockRow[];
};

function computeTabFlags(
  product: ProductWithCategoryName,
  compositionStockRows: CompositionStockRow[],
  isOnMenu: boolean,
): TabFlags {
  const types = (product.product_type as string[] | null) ?? [];
  const isRecipe = types.includes("recipe");
  const isIngredient = types.includes("ingredient");
  // Vendu = intent explicite `sellable` OU déjà sur un menu (couvre les produits créés côté mobile).
  const isForSale = types.includes("sellable") || isOnMenu;
  return {
    isForSale,
    // Recette : recettes (BOM) et ingrédients composés.
    hasFicheTechnique: isRecipe || isIngredient,
    // Achats (réception + fournisseurs) : ce qu'on ACHÈTE réellement (ingrédient brut).
    // Une préparation maison (ingrédient + recette) se produit (pas de réception).
    hasAchatsTab: isIngredient && !isRecipe,
    // Onglet Stock : seul un ingrédient pur utilise la fiche stock directe (les autres ont le sélecteur de mode).
    isPureIngredient: isIngredient && !isForSale,
    portionUnit: product.portion_unit ?? null,
    persoStockRows: compositionStockRows.filter(
      (r) => r.isSelfComposition || r.composition.composition_kind === "modifier",
    ),
  };
}

function buildValidTabs(flags: TabFlags): string[] {
  return [
    "propriete",
    "stock",
    ...(flags.isForSale ? ["prix-menus", "personnalisation"] : []),
    ...(flags.hasFicheTechnique ? ["recette"] : []),
    ...(flags.hasAchatsTab ? ["achats"] : []),
  ];
}

function resolveSelfStock(rows: CompositionStockRow[]) {
  const lineStock = rows.find((r) => r.isSelfComposition)?.lineStock ?? null;
  return {
    hasStock: lineStock != null,
    stockId: lineStock?.id ?? null,
    lineUnit: lineStock?.unit ?? null,
    lineCurrentStock: lineStock?.current_stock ?? 0,
  };
}

const LS_KEY = "product-dashboard-active-tab";

export function ProductEstablishmentDashboardTabs({
  product,
  establishmentId,
  organizationId,
  backHref,
  compositions,
  compositionStockRows,
  menuProductPricing,
}: TabsProps) {
  const flags = computeTabFlags(product, compositionStockRows, menuProductPricing.length > 0);
  const { isForSale, hasFicheTechnique, hasAchatsTab, isPureIngredient, persoStockRows } = flags;
  const validTabs = buildValidTabs(flags);
  const persoCount = persoStockRows.length;

  const { hasStock, stockId, lineUnit, lineCurrentStock } = resolveSelfStock(compositionStockRows);

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
        {hasAchatsTab && <TabsTrigger value="achats">Achats</TabsTrigger>}
      </TabsList>

      <TabsContent value="propriete">
        <ProductProprieteForm
          product={product}
          productId={product.id}
          organizationId={organizationId}
          establishmentId={establishmentId}
          backHref={backHref}
          stockUnit={lineUnit}
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
          isIngredient={isPureIngredient}
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
            productStockId={stockId}
            stockUnit={lineUnit}
            currentStock={lineCurrentStock}
          />
        </TabsContent>
      )}

      {hasAchatsTab && (
        <TabsContent value="achats">
          <div className="space-y-6">
            <AchatsGuidance productId={product.id} hasStock={hasStock} />
            <PurchaseReceptionCard
              productId={product.id}
              organizationId={organizationId}
              establishmentId={establishmentId}
              productStockId={stockId}
              unit={lineUnit}
              currentStock={lineCurrentStock}
            />
            <ProductFournisseursPrixPanel
              productId={product.id}
              organizationId={organizationId}
              portionUnit={lineUnit}
              establishmentId={establishmentId}
              manageStock
              title="Paramètres fournisseurs"
              description="Unités de commande, références, délais et prix catalogue."
            />
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}
