"use client";

import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
  menuProductPricing: MenuProductPricingJoin[];
  organizationId: string;
}) {
  const technicalLines = compositions.filter((c) => c.main_product_id !== c.component_product_id);
  const componentIds = technicalLines.map((c) => c.component_product_id);

  const { data: componentPrices } = useComponentCurrentPurchasePrices(componentIds, organizationId);
  const { data: selfHistory = [] } = useProductPurchasePriceHistory(product.id, organizationId);

  const selfPurchasePriceHT = getCurrentPurchasePrice(selfHistory)?.unit_cost ?? null;
  const vatRate = product.vat_rate;

  // Coût HT de la recette (somme des ingrédients × prix achat HT)
  const hasComponentPrices = technicalLines.some((c) => componentPrices?.has(c.component_product_id));
  const recipeCostHT = hasComponentPrices
    ? technicalLines
        .filter((c) => c.composition_kind === "recipe")
        .reduce((sum, c) => {
          const unitCost = componentPrices?.get(c.component_product_id);
          return unitCost != null ? sum + (c.default_quantity ?? 1) * unitCost : sum;
        }, 0)
    : null;

  const costHT = recipeCostHT ?? selfPurchasePriceHT;

  // Marge sur le prix de vente du produit lui-même
  // Menus actifs uniquement
  const activeMenus = menuProductPricing.filter((mp) => mp.menu && !mp.menu.deleted && mp.menuProduct.price != null);

  return (
    <div className="space-y-6">
      {/* Coût HT résumé */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{hasComponentPrices ? "Coût matière HT (recette)" : "Prix d'achat HT"}</CardDescription>
          </CardHeader>
          <CardContent>
            {costHT != null ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">{eur.format(costHT)}</p>
                {vatRate?.value != null && (
                  <p className="text-muted-foreground text-xs">TVA produit : {vatRate.value} %</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                — <span className="text-xs">Renseignez les prix d&apos;achat dans l&apos;onglet dédié</span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Menus configurés</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeMenus.length}</p>
            <p className="text-muted-foreground text-xs">
              {activeMenus.length === 0
                ? "Aucun menu avec prix configuré"
                : `menu${activeMenus.length > 1 ? "s" : ""} avec prix TTC défini`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Marges par menu */}
      <Card>
        <CardHeader>
          <CardTitle>Marge par menu</CardTitle>
          <CardDescription>
            Pour chaque menu où le produit est référencé, la marge est calculée sur le prix TTC du menu converti en HT
            (même taux TVA que le produit).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Alerte food cost globale */}
          {product.food_cost_target != null &&
            activeMenus.length > 0 &&
            (() => {
              const exceeded = activeMenus.filter(({ menuProduct }) => {
                const menuHT = ttcToHt(menuProduct.price ?? 0, vatRate);
                const ratio = costHT != null && menuHT > 0 ? costHT / menuHT : null;
                return ratio != null && ratio > product.food_cost_target!;
              });
              if (!exceeded.length) return null;
              return (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Food cost dépassé</strong> sur {exceeded.length} menu{exceeded.length > 1 ? "s" : ""}. Cible
                    : marge ≥ {pct.format(1 - product.food_cost_target)} (food cost ≤{" "}
                    {pct.format(product.food_cost_target)}).
                  </span>
                </div>
              );
            })()}

          {activeMenus.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Le produit n&apos;est encore référencé dans aucun menu actif, ou les prix de menu ne sont pas configurés.
            </p>
          ) : (
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

                    // Alerte food cost : on compare le ratio coût/vente avec la cible
                    const foodCostTarget = product.food_cost_target;
                    const actualFoodCostRatio = menuMargin != null ? 1 - menuMargin : null;
                    const isFoodCostExceeded =
                      foodCostTarget != null && actualFoodCostRatio != null && actualFoodCostRatio > foodCostTarget;

                    return (
                      <TableRow
                        key={menuProduct.id}
                        className={isFoodCostExceeded ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                      >
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
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {eur.format(menuHT)}
                        </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
