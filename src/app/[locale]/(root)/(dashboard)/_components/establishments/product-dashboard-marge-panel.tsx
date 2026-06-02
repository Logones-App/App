"use client";

import { AlertTriangle } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useComponentFifoCosts } from "@/lib/queries/fifo-cost-queries";
import {
  ttcToHt,
  type MenuProductPricingJoin,
  type ProductCompositionRow,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import {
  getCurrentPurchasePrice,
  useComponentCurrentPurchasePrices,
  useProductPurchasePriceHistory,
} from "@/lib/queries/purchase-price-queries";
import { compositionLineCost } from "@/lib/utils/unit-conversion";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

function marginColor(m: number) {
  if (m >= 0.6) return "text-green-600";
  if (m >= 0.3) return "text-yellow-600";
  return "text-red-600";
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-muted-foreground">—</span>;
  return <span className={`font-semibold tabular-nums ${marginColor(margin)}`}>{pct.format(margin)}</span>;
}

export function ProductMargePanel({
  product,
  compositions,
  menuProductPricing,
  organizationId,
  establishmentId,
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
  menuProductPricing: MenuProductPricingJoin[];
  organizationId: string;
  establishmentId: string;
}) {
  const technicalLines = compositions.filter((c) => c.main_product_id !== c.component_product_id);
  const componentIds = technicalLines.map((c) => c.component_product_id);

  const { data: fifoCosts } = useComponentFifoCosts(componentIds, organizationId, establishmentId);
  const { data: lastPrices } = useComponentCurrentPurchasePrices(componentIds, organizationId);
  const componentPrices = new Map<string, number>([...(lastPrices ?? new Map()), ...(fifoCosts ?? new Map())]);
  const { data: selfHistory = [] } = useProductPurchasePriceHistory(product.id, organizationId);

  const selfPurchasePriceHT = getCurrentPurchasePrice(selfHistory)?.unit_cost ?? null;
  const vatRate = product.vat_rate;

  const hasComponentPrices = technicalLines.some((c) => componentPrices?.has(c.component_product_id));
  const recipeCostHT = hasComponentPrices
    ? technicalLines
        .filter((c) => c.composition_kind === "recipe")
        .reduce((sum, c) => {
          const uc = componentPrices?.get(c.component_product_id);
          const cf = (c as unknown as { conversion_factor: number | null }).conversion_factor ?? null;
          const cost = compositionLineCost(c.default_quantity, c.quantity_unit, uc, c.component?.portion_unit, cf);
          return cost != null ? sum + cost : sum;
        }, 0)
    : null;

  const costHT = recipeCostHT ?? selfPurchasePriceHT;

  const activeMenus = menuProductPricing.filter((mp) => mp.menu && !mp.menu.deleted && mp.menuProduct.price != null);

  if (activeMenus.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Le produit n&apos;est référencé dans aucun menu actif avec prix configuré.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {product.food_cost_target != null &&
        (() => {
          const exceeded = activeMenus.filter(({ menuProduct }) => {
            const menuHT = ttcToHt(menuProduct.price ?? 0, vatRate);
            const ratio = costHT != null && menuHT > 0 ? costHT / menuHT : null;
            return ratio != null && ratio > product.food_cost_target!;
          });
          if (!exceeded.length) return null;
          return (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Food cost dépassé</strong> sur {exceeded.length} menu{exceeded.length > 1 ? "s" : ""}. Cible :
                marge ≥ {pct.format(1 - product.food_cost_target)} (food cost ≤ {pct.format(product.food_cost_target)}).
              </span>
            </div>
          );
        })()}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead className="text-right">Prix TTC</TableHead>
              <TableHead className="text-right">Prix HT</TableHead>
              <TableHead className="text-right">Coût HT</TableHead>
              <TableHead className="text-right">Marge HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeMenus.map(({ menuProduct, menu }) => {
              const menuTTC = menuProduct.price!;
              const menuHT = ttcToHt(menuTTC, vatRate);
              const menuMargin = costHT != null && menuHT > 0 ? (menuHT - costHT) / menuHT : null;
              const foodCostTarget = product.food_cost_target;
              const actualFoodCostRatio = menuMargin != null ? 1 - menuMargin : null;
              const isFoodCostExceeded =
                foodCostTarget != null && actualFoodCostRatio != null && actualFoodCostRatio > foodCostTarget;

              return (
                <TableRow key={menuProduct.id} className={isFoodCostExceeded ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {menu?.name ?? "—"}
                      {isFoodCostExceeded && (
                        <span
                          title={`Food cost réel (${pct.format(actualFoodCostRatio)}) dépasse la cible (${pct.format(foodCostTarget)})`}
                          className="text-red-600"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{eur.format(menuTTC)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">{eur.format(menuHT)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {costHT != null ? eur.format(costHT) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <MarginBadge margin={menuMargin} />
                    {isFoodCostExceeded && (
                      <p className="mt-0.5 text-xs text-red-600">Cible {pct.format(1 - foodCostTarget)} min</p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
