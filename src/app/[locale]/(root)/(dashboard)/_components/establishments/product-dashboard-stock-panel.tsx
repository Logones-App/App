"use client";

import { useCallback, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import {
  hasModifierLineForComponent,
  isModifierCompositionKind,
  isRecipeCompositionKind,
  setIngredientStockInventoryTracked,
  setSelfLineInventoryTracked,
  willSelfTrackingDisableAnyCurrentlyTrackedStock,
} from "@/lib/product-composition-stock-tracking";
import { PRODUCT_DASHBOARD_QUERY_KEY, type CompositionStockRow } from "@/lib/queries/product-establishment-dashboard";
import { defaultProductStockInsert, insertInitialMovement } from "@/lib/queries/stock-movement-queries";
import { createClient } from "@/lib/supabase/client";

import { CompositionStockCard } from "./product-composition-dashboard-blocks";
import { ChangeStockUnitSection } from "./product-dashboard-change-unit";
import { StockMovementsSection } from "./product-dashboard-stock-movements";

const DEFAULT_STOCK_UNIT = "piece";

function useProductDashboardHref(establishmentId: string): (productId: string) => string {
  const pathname = usePathname() ?? "";
  return useCallback(
    (productId: string) => {
      const parts = pathname.split("/").filter(Boolean);
      const locale = parts[0] ?? "fr";
      const dash = parts.indexOf("dashboard");
      const after = dash >= 0 ? parts.slice(dash + 1) : [];
      if (after[0] === "admin" && after[1] === "organizations" && after[3] === "establishments") {
        const orgId = after[2];
        const estId = after[4];
        if (orgId && estId) {
          return `/${locale}/dashboard/admin/organizations/${orgId}/establishments/${estId}/products/${productId}`;
        }
      }
      return `/${locale}/dashboard/establishments/${establishmentId}/products/${productId}`;
    },
    [pathname, establishmentId],
  );
}

function ProductStockScopeSection({
  compositionStockRows,
  scopeProductId,
  rootProductId,
  establishmentId,
  organizationId,
  nestingLevel,
  scopeDisplayName,
}: {
  compositionStockRows: CompositionStockRow[];
  scopeProductId: string;
  rootProductId: string;
  establishmentId: string;
  organizationId: string;
  nestingLevel: number;
  scopeDisplayName?: string;
}) {
  const queryClient = useQueryClient();
  const productHref = useProductDashboardHref(establishmentId);

  const [initQty, setInitQty] = useState("0");
  const [initUnit, setInitUnit] = useState(DEFAULT_STOCK_UNIT);

  const selfRow = compositionStockRows.find((r) => r.isSelfComposition);
  const selfStock = selfRow?.lineStock ?? null;
  const selfTracked = Boolean(selfStock?.inventory_tracked);
  const selfActivationHelper = willSelfTrackingDisableAnyCurrentlyTrackedStock(compositionStockRows)
    ? "En activant le suivi sur l’unité de vente, les fiches liées aux lignes recette (et les pools sans ligne modifier sur le même composant) passent en non suivi. Les lignes modifier suivies restent actives (mode hybride caisse)."
    : undefined;

  const invalidate = () => {
    const ids = [rootProductId, scopeProductId];
    const unique = [...new Set(ids)];
    for (const id of unique) {
      void queryClient.invalidateQueries({
        queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, id, establishmentId, organizationId],
      });
    }
    void queryClient.invalidateQueries({
      queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["establishment-stocks", establishmentId, organizationId],
    });
  };

  const createSelfLineStockMutation = useMutation({
    mutationFn: async ({
      compositionId,
      initialQuantity,
      unit,
    }: {
      compositionId: string;
      initialQuantity: number;
      unit: string;
    }) => {
      const supabase = createClient();
      const { data: st, error } = await supabase
        .from("product_stocks")
        .insert({
          ...defaultProductStockInsert(compositionId, establishmentId, organizationId),
          current_stock: initialQuantity,
          unit,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!st?.id) throw new Error("Fiche stock non créée.");
      await setSelfLineInventoryTracked(supabase, st.id, true, compositionStockRows);
      await insertInitialMovement(scopeProductId, organizationId, establishmentId, st.id, initialQuantity, unit);
    },
    onSuccess: () => {
      toast.success("Stock initialisé.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Création impossible.");
    },
  });

  const createSelfCompositionAndStockMutation = useMutation({
    mutationFn: async ({ initialQuantity, unit }: { initialQuantity: number; unit: string }) => {
      const supabase = createClient();
      const { data: comp, error: compErr } = await supabase
        .from("product_compositions")
        .insert({
          main_product_id: scopeProductId,
          component_product_id: scopeProductId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          composition_kind: "recipe",
          default_quantity: 1,
          max_quantity: null,
          display_order: 0,
          unit_supplement_price: null,
          price_multiplier: null,
          show_in_customization: false,
          is_required: false,
          deleted: false,
        })
        .select("id")
        .single();
      if (compErr) throw compErr;
      if (!comp?.id) throw new Error("Composition self non créée.");
      const { data: st, error: stockErr } = await supabase
        .from("product_stocks")
        .insert({
          ...defaultProductStockInsert(comp.id, establishmentId, organizationId),
          current_stock: initialQuantity,
          unit,
        })
        .select("id")
        .single();
      if (stockErr) throw stockErr;
      if (!st?.id) throw new Error("Fiche stock non créée.");
      await setSelfLineInventoryTracked(supabase, st.id, true, compositionStockRows);
      await insertInitialMovement(scopeProductId, organizationId, establishmentId, st.id, initialQuantity, unit);
    },
    onSuccess: () => {
      toast.success("Stock initialisé.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Création impossible.");
    },
  });

  const stockSetupPending = createSelfLineStockMutation.isPending || createSelfCompositionAndStockMutation.isPending;

  const selfMutation = useMutation({
    mutationFn: async (tracked: boolean) => {
      if (!selfStock?.id) throw new Error("Pas de fiche stock sur la ligne self.");
      const supabase = createClient();
      await setSelfLineInventoryTracked(supabase, selfStock.id, tracked, compositionStockRows);
    },
    onSuccess: () => {
      toast.success("Suivi inventaire mis à jour.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
    },
  });

  const ingredientMutation = useMutation({
    mutationFn: async ({ stockId, tracked }: { stockId: string; tracked: boolean }) => {
      const supabase = createClient();
      await setIngredientStockInventoryTracked(supabase, stockId, tracked, selfStock?.id, compositionStockRows);
    },
    onSuccess: () => {
      toast.success("Suivi inventaire mis à jour.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
    },
  });

  const pending = selfMutation.isPending || ingredientMutation.isPending || stockSetupPending;

  const handleInit = (mutate: (args: { initialQuantity: number; unit: string }) => void) => {
    const qty = parseFloat(initQty.replace(",", "."));
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Quantité invalide.");
      return;
    }
    mutate({ initialQuantity: qty, unit: initUnit || DEFAULT_STOCK_UNIT });
  };

  if (compositionStockRows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Initialiser le stock</CardTitle>
          <CardDescription>
            Définissez le stock initial de ce produit pour activer le suivi des quantités.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="init-qty">Quantité initiale</Label>
              <Input
                id="init-qty"
                value={initQty}
                onChange={(e) => setInitQty(e.target.value)}
                inputMode="decimal"
                className="w-24 tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Select value={initUnit} onValueChange={setInitUnit}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTION_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u === "piece" ? "pièce" : u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={stockSetupPending}
              onClick={() => handleInit(createSelfCompositionAndStockMutation.mutate)}
            >
              {stockSetupPending ? "Initialisation…" : "Initialiser le stock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const inner = (
    <>
      {!selfRow ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock du produit fini</CardTitle>
            <CardDescription>
              Ce produit a des ingrédients mais pas encore de suivi du produit fini. Initialisez le stock pour commencer
              le suivi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="self-init-qty">Quantité initiale</Label>
                <Input
                  id="self-init-qty"
                  value={initQty}
                  onChange={(e) => setInitQty(e.target.value)}
                  inputMode="decimal"
                  className="w-24 tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label>Unité</Label>
                <Select value={initUnit} onValueChange={setInitUnit}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTION_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u === "piece" ? "pièce" : u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={stockSetupPending}
                onClick={() => handleInit(createSelfCompositionAndStockMutation.mutate)}
              >
                {stockSetupPending ? "Initialisation…" : "Initialiser le stock"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(() => {
        const selfRows = compositionStockRows.filter((r) => r.isSelfComposition);
        const recipeRows = compositionStockRows.filter(
          (r) => !r.isSelfComposition && isRecipeCompositionKind(r.composition.composition_kind),
        );
        const modifierRows = compositionStockRows.filter(
          (r) => !r.isSelfComposition && isModifierCompositionKind(r.composition.composition_kind),
        );

        const renderRow = (csr: (typeof compositionStockRows)[number]) => {
          const {
            composition: row,
            isSelfComposition,
            lineStock,
            componentIdentityStock,
            nestedCompositionStockRows,
          } = csr;
          const lineLockedBySelf = selfTracked && !isSelfComposition && isRecipeCompositionKind(row.composition_kind);
          const poolLockedBySelf =
            selfTracked &&
            !isSelfComposition &&
            !hasModifierLineForComponent(compositionStockRows, row.component_product_id);
          return (
            <div key={row.id} className="space-y-3">
              <CompositionStockCard
                row={row}
                isSelfComposition={isSelfComposition}
                lineStock={lineStock}
                componentIdentityStock={componentIdentityStock}
                selfActivationHelper={isSelfComposition ? selfActivationHelper : undefined}
                lineSwitchLockedBySelf={lineLockedBySelf}
                poolSwitchLockedBySelf={poolLockedBySelf}
                selfTracked={selfTracked}
                pending={pending}
                productId={scopeProductId}
                establishmentId={establishmentId}
                organizationId={organizationId}
                onCreateSelfLineStock={
                  isSelfComposition && !lineStock
                    ? (compositionId, qty, unit) =>
                        createSelfLineStockMutation.mutate({ compositionId, initialQuantity: qty, unit })
                    : undefined
                }
                createSelfLineStockPending={stockSetupPending}
                onSelfTrackedChange={(v) => selfMutation.mutate(v)}
                onIngredientTrackedChange={(stockId, tracked) => ingredientMutation.mutate({ stockId, tracked })}
              />
              {nestedCompositionStockRows?.length ? (
                <ProductStockScopeSection
                  compositionStockRows={nestedCompositionStockRows}
                  scopeProductId={row.component_product_id}
                  rootProductId={rootProductId}
                  establishmentId={establishmentId}
                  organizationId={organizationId}
                  nestingLevel={nestingLevel + 1}
                  scopeDisplayName={row.component?.name ?? undefined}
                />
              ) : null}
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {selfRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Stock du produit fini
                </p>
                {selfRows.map(renderRow)}
              </div>
            )}
            {recipeRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Stock par ingrédient
                </p>
                {recipeRows.map(renderRow)}
              </div>
            )}
            {modifierRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Stock des suppléments
                </p>
                {modifierRows.map(renderRow)}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );

  if (nestingLevel > 0) {
    return (
      <div className="border-muted mt-3 space-y-4 border-l-2 pl-4">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-medium tracking-wide uppercase">
            Sous-compositions (même règles que la fiche produit)
          </span>
          <Link
            href={productHref(scopeProductId)}
            className="text-primary inline-flex items-center gap-1 font-normal normal-case underline-offset-4 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Fiche {scopeDisplayName ?? "sous-produit"}
          </Link>
        </div>
        {inner}
      </div>
    );
  }

  return inner;
}

export function ProductStockPanel({
  compositionStockRows,
  productId,
  establishmentId,
  organizationId,
}: {
  compositionStockRows: CompositionStockRow[];
  productId: string;
  establishmentId: string;
  organizationId: string;
}) {
  // Stock courant depuis la self-composition
  const selfRow = compositionStockRows.find((r) => r.isSelfComposition);
  const currentStock = selfRow?.lineStock?.current_stock ?? 0;
  const selfStockId = selfRow?.lineStock?.id ?? null;
  const selfStockUnit = selfRow?.lineStock?.unit ?? null;

  return (
    <div className="space-y-4">
      <ProductStockScopeSection
        compositionStockRows={compositionStockRows}
        scopeProductId={productId}
        rootProductId={productId}
        establishmentId={establishmentId}
        organizationId={organizationId}
        nestingLevel={0}
      />

      <StockMovementsSection
        productId={productId}
        organizationId={organizationId}
        establishmentId={establishmentId}
        productStockId={selfStockId}
        currentStock={currentStock}
        unit={selfStockUnit}
      />

      {selfStockId && selfStockUnit && (
        <ChangeStockUnitSection
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId}
          stockId={selfStockId}
          currentUnit={selfStockUnit}
          currentQty={currentStock}
        />
      )}
    </div>
  );
}
