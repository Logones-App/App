"use client";

import { useCallback, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  hasModifierLineForComponent,
  isRecipeCompositionKind,
  setIngredientStockInventoryTracked,
  setSelfLineInventoryTracked,
  willSelfTrackingDisableAnyCurrentlyTrackedStock,
} from "@/lib/product-composition-stock-tracking";
import type { CompositionStockRow } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";

import { CompositionStockCard } from "./product-composition-dashboard-blocks";
import { StockMovementsSection } from "./product-dashboard-stock-movements";
import { PRODUCT_DASHBOARD_QUERY_KEY } from "./product-stock-quick-adjust";

const DEFAULT_STOCK_UNIT = "u";

function defaultProductStockInsert(
  productCompositionId: string,
  establishmentId: string,
  organizationId: string,
): TablesInsert<"product_stocks"> {
  return {
    product_composition_id: productCompositionId,
    establishment_id: establishmentId,
    organization_id: organizationId,
    current_stock: 0,
    min_stock: 0,
    max_stock: null,
    reserved_stock: 0,
    unit: DEFAULT_STOCK_UNIT,
    inventory_tracked: false,
    deleted: false,
    low_stock_threshold: null,
    critical_stock_threshold: null,
  };
}

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
    mutationFn: async ({ compositionId }: { compositionId: string }) => {
      const supabase = createClient();
      const { data: st, error } = await supabase
        .from("product_stocks")
        .insert(defaultProductStockInsert(compositionId, establishmentId, organizationId))
        .select("id")
        .single();
      if (error) throw error;
      if (!st?.id) throw new Error("Fiche stock non créée.");
      await setSelfLineInventoryTracked(supabase, st.id, true, compositionStockRows);
    },
    onSuccess: () => {
      toast.success("Fiche stock créée — suivi activé sur l’unité de vente.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Création impossible.");
    },
  });

  const createSelfCompositionAndStockMutation = useMutation({
    mutationFn: async () => {
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
        .insert(defaultProductStockInsert(comp.id, establishmentId, organizationId))
        .select("id")
        .single();
      if (stockErr) throw stockErr;
      if (!st?.id) throw new Error("Fiche stock non créée.");
      await setSelfLineInventoryTracked(supabase, st.id, true, compositionStockRows);
    },
    onSuccess: () => {
      toast.success("Composition self et fiche stock créées — suivi sur l’unité de vente activé.");
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

  if (compositionStockRows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
          <CardDescription>
            Les fiches <span className="font-medium">product_stocks</span> sont liées aux lignes de{" "}
            <span className="font-medium">product_compositions</span> (clé{" "}
            <span className="font-medium">product_composition_id</span>). Pour suivre le stock au niveau{" "}
            <span className="font-medium">unité de vente</span>, il faut une composition « self » (même produit en plat
            et en composant) et une fiche stock associée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Aucune composition pour ce produit à cet établissement. Vous pouvez créer d’un coup la ligne self et la
            fiche stock (quantité 0, unité « {DEFAULT_STOCK_UNIT} ») puis activer le suivi sur cette unité.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={stockSetupPending}
            onClick={() => createSelfCompositionAndStockMutation.mutate()}
          >
            {stockSetupPending ? "Création…" : "Créer ligne unité + fiche stock"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const inner = (
    <>
      {!selfRow ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ligne « unité de vente » (self)</CardTitle>
            <CardDescription>
              Ce produit a des compositions ingrédients, mais pas encore la ligne self (plat = composant). Sans elle,
              pas de stock « produit fini » sur cet établissement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={stockSetupPending}
              onClick={() => createSelfCompositionAndStockMutation.mutate()}
            >
              {stockSetupPending ? "Création…" : "Créer composition self + fiche stock"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {compositionStockRows.map((csr) => {
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
                    ? (compositionId) => createSelfLineStockMutation.mutate({ compositionId })
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
        })}
      </div>
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

  return (
    <div className="space-y-4">
      {compositionStockRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
            <CardDescription>
              Suivi aligné sur la caisse : <span className="font-medium">unité de vente (self)</span>,{" "}
              <span className="font-medium">recettes</span> et/ou{" "}
              <span className="font-medium">suppléments (modifier)</span>. Le self suivi peut coexister avec le suivi
              des <span className="font-medium">modifier</span> (hybride) ; les lignes{" "}
              <span className="font-medium">recette</span> du même plat ne sont pas débitées en parallèle du self. Une
              fiche <span className="font-medium">product_stocks</span> par maillon suivi.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <ProductStockScopeSection
        compositionStockRows={compositionStockRows}
        scopeProductId={productId}
        rootProductId={productId}
        establishmentId={establishmentId}
        organizationId={organizationId}
        nestingLevel={0}
      />

      <StockMovementsSection productId={productId} organizationId={organizationId} currentStock={currentStock} />
    </div>
  );
}
