"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import { useComponentFifoCosts } from "@/lib/queries/fifo-cost-queries";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
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
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
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

function PriceCell({
  price,
  isActive,
  disabled,
  onActivate,
  onSave,
  onCancel,
}: {
  price: number | null;
  isActive: boolean;
  disabled: boolean;
  onActivate: () => void;
  onSave: (v: number | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(price != null ? String(price) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setDraft(price != null ? String(price) : "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isActive, price]);

  const commit = () => {
    const t = draft.trim().replace(",", ".");
    if (t === "") {
      onSave(null);
      return;
    }
    const n = parseFloat(t);
    onSave(Number.isFinite(n) ? n : price);
  };

  if (isActive) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        inputMode="decimal"
        className="h-7 w-24 px-2 text-right text-sm tabular-nums"
        placeholder="Prix TTC"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={disabled}
      className="hover:bg-muted/60 focus:ring-ring w-full rounded px-1 py-0.5 text-right tabular-nums focus:ring-1 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {price != null ? eur.format(price) : <span className="text-muted-foreground text-sm italic">non défini</span>}
    </button>
  );
}

function computeMenuStats(
  price: number | null,
  costHT: number | null,
  vatRate: { value: number | null } | null,
  foodCostTarget: number | null,
) {
  const menuHT = price != null ? ttcToHt(price, vatRate) : null;
  const marginBrut = menuHT != null && costHT != null ? menuHT - costHT : null;
  const menuMargin = marginBrut != null && menuHT != null && menuHT > 0 ? marginBrut / menuHT : null;
  const actualFoodCostRatio = menuMargin != null ? 1 - menuMargin : null;
  const isFoodCostExceeded =
    foodCostTarget != null && actualFoodCostRatio != null && actualFoodCostRatio > foodCostTarget;
  return { marginBrut, menuMargin, actualFoodCostRatio, isFoodCostExceeded };
}

function MenuPriceRow({
  menu,
  mp,
  costHT,
  vatRate,
  foodCostTarget,
  isActive,
  upsertPending,
  onActivate,
  onSave,
  onCancel,
}: {
  menu: Tables<"menus">;
  mp: MenuProductPricingJoin | undefined;
  costHT: number | null;
  vatRate: { value: number | null } | null;
  foodCostTarget: number | null;
  isActive: boolean;
  upsertPending: boolean;
  onActivate: () => void;
  onSave: (v: number | null) => void;
  onCancel: () => void;
}) {
  const price = mp?.menuProduct.price ?? null;
  const { marginBrut, menuMargin, actualFoodCostRatio, isFoodCostExceeded } = computeMenuStats(
    price,
    costHT,
    vatRate,
    foodCostTarget,
  );

  return (
    <TableRow className={isFoodCostExceeded ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {menu.name ?? "—"}
          {isFoodCostExceeded && (
            <span
              title={`Food cost réel (${pct.format(actualFoodCostRatio ?? 0)}) dépasse la cible (${pct.format(foodCostTarget ?? 0)})`}
              className="text-red-600"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <PriceCell
          price={price}
          isActive={isActive}
          disabled={upsertPending}
          onActivate={onActivate}
          onSave={onSave}
          onCancel={onCancel}
        />
      </TableCell>
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {costHT != null ? eur.format(costHT) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {marginBrut != null ? (
          <span className={marginBrut < 0 ? "text-red-600" : ""}>{eur.format(marginBrut)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <MarginBadge margin={menuMargin} />
        {isFoodCostExceeded && foodCostTarget != null && (
          <p className="mt-0.5 text-xs text-red-600">Cible {pct.format(1 - foodCostTarget)} min</p>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ProductMargePanel({
  product,
  compositions,
  menuProductPricing,
  allMenus,
  organizationId,
  establishmentId,
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
  menuProductPricing: MenuProductPricingJoin[];
  allMenus: Tables<"menus">[];
  organizationId: string;
  establishmentId: string;
}) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const technicalLines = compositions.filter((c) => c.main_product_id !== c.component_product_id);
  const componentIds = technicalLines.map((c) => c.component_product_id);

  const { data: fifoCosts } = useComponentFifoCosts(componentIds, organizationId, establishmentId);
  const { data: lastPrices } = useComponentCurrentPurchasePrices(componentIds, organizationId);
  const componentPrices = new Map<string, number>([...(lastPrices ?? new Map()), ...(fifoCosts ?? new Map())]);
  const { data: selfHistory = [] } = useProductPurchasePriceHistory(product.id, organizationId);

  const selfPurchasePriceHT = getCurrentPurchasePrice(selfHistory)?.unit_cost ?? null;
  const vatRate = product.vat_rate;

  const hasComponentPrices = technicalLines.some((c) => componentPrices.has(c.component_product_id));
  const recipeCostHT = hasComponentPrices
    ? technicalLines
        .filter((c) => c.composition_kind === "recipe")
        .reduce((sum, c) => {
          const uc = componentPrices.get(c.component_product_id);
          const cf = (c as unknown as { conversion_factor: number | null }).conversion_factor ?? null;
          const cost = compositionLineCost(c.default_quantity, c.quantity_unit, uc, c.component?.portion_unit, cf);
          return cost != null ? sum + cost : sum;
        }, 0)
    : null;

  const costHT = recipeCostHT ?? selfPurchasePriceHT;

  const pricingMap = new Map<string, MenuProductPricingJoin>(
    menuProductPricing.filter((mp) => mp.menu && !mp.menu.deleted).map((mp) => [mp.menu!.id, mp]),
  );

  const upsertMutation = useMutation({
    mutationFn: async ({
      menuId,
      price,
      existingId,
    }: {
      menuId: string;
      price: number | null;
      existingId?: string;
    }) => {
      const supabase = createClient();
      if (existingId) {
        const { error } = await supabase.from("menus_products").update({ price }).eq("id", existingId);
        if (error) throw error;
        if (price != null) await insertMenusProductPriceHistoryRow(supabase, existingId, price, "product_dashboard");
      } else {
        const { data: inserted, error } = await supabase
          .from("menus_products")
          .insert({
            menus_id: menuId,
            establishment_id: establishmentId,
            organization_id: organizationId,
            products_id: product.id,
            price,
            deleted: false,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (price != null && inserted.id) {
          await insertMenusProductPriceHistoryRow(supabase, inserted.id, price, "product_dashboard");
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, product.id, establishmentId, organizationId],
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour du prix."),
  });

  if (allMenus.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">Aucun menu configuré pour cet établissement.</p>
    );
  }

  const foodCostTarget = product.food_cost_target;
  const exceededCount = allMenus.filter((menu) => {
    const mp = pricingMap.get(menu.id);
    const price = mp?.menuProduct.price ?? null;
    if (price == null || costHT == null) return false;
    const menuHT = ttcToHt(price, vatRate);
    return menuHT > 0 && foodCostTarget != null && costHT / menuHT > foodCostTarget;
  }).length;

  return (
    <div className="space-y-3">
      {foodCostTarget != null && exceededCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Food cost dépassé</strong> sur {exceededCount} menu{exceededCount > 1 ? "s" : ""}. Cible : marge ≥{" "}
            {pct.format(1 - foodCostTarget)} (food cost ≤ {pct.format(foodCostTarget)}).
          </span>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead className="text-right">Prix TTC</TableHead>
              <TableHead className="text-right">Coût HT</TableHead>
              <TableHead className="text-right">Marge brute</TableHead>
              <TableHead className="text-right">% marge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allMenus.map((menu) => (
              <MenuPriceRow
                key={menu.id}
                menu={menu}
                mp={pricingMap.get(menu.id)}
                costHT={costHT}
                vatRate={vatRate}
                foodCostTarget={foodCostTarget}
                isActive={activeCell === menu.id}
                upsertPending={upsertMutation.isPending}
                onActivate={() => setActiveCell(menu.id)}
                onSave={(v) => {
                  setActiveCell(null);
                  const mp = pricingMap.get(menu.id);
                  if (v !== null || mp !== undefined) {
                    upsertMutation.mutate({ menuId: menu.id, price: v, existingId: mp?.menuProduct.id });
                  }
                }}
                onCancel={() => setActiveCell(null)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
