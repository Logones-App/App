"use client";

import { useCallback } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, PackageCheck, Soup, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { isRecipeCompositionKind } from "@/lib/product-composition-stock-tracking";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type CompositionStockRow,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import { defaultProductStockInsert } from "@/lib/queries/stock-movement-queries";
import { createClient } from "@/lib/supabase/client";

import { CreateIngredientFromProductCard } from "./create-ingredient-from-product-modal";
import { DeclinationGeneratorCard } from "./declination-generator-modal";
import { ProductSection } from "./product-dashboard-stock-product-section";

type StockMode = "none" | "product" | "ingredients";

const MODES: { value: StockMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "none",
    label: "Pas de gestion stock",
    description: "La vente est enregistrée dans les rapports. Aucun stock décrémenté.",
    icon: <X className="h-4 w-4" />,
  },
  {
    value: "product",
    label: "Stock produit fini",
    description: "Chaque vente décrémente le compteur du produit assemblé de 1 unité.",
    icon: <PackageCheck className="h-4 w-4" />,
  },
  {
    value: "ingredients",
    label: "Stock ingrédients",
    description: "Chaque vente décrémente les ingrédients cochés selon la fiche technique.",
    icon: <Soup className="h-4 w-4" />,
  },
];

function useProductHref(establishmentId: string): (productId: string) => string {
  const pathname = usePathname();
  return useCallback(
    (productId: string) => {
      const parts = pathname.split("/").filter(Boolean);
      const locale = parts[0] ?? "fr";
      const dash = parts.indexOf("dashboard");
      const after = dash >= 0 ? parts.slice(dash + 1) : [];
      if (after[0] === "admin" && after[1] === "organizations" && after[3] === "establishments") {
        const orgId = after[2];
        const estId = after[4];
        if (orgId && estId)
          return `/${locale}/dashboard/admin/organizations/${orgId}/establishments/${estId}/products/${productId}`;
      }
      return `/${locale}/dashboard/establishments/${establishmentId}/products/${productId}`;
    },
    [pathname, establishmentId],
  );
}

function useInvalidate(productId: string, establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({ queryKey: ["establishment-stocks", establishmentId, organizationId] });
  }, [queryClient, productId, establishmentId, organizationId]);
}

function useSetStockMode(productId: string, selfRow: CompositionStockRow | undefined, invalidate: () => void) {
  return useMutation({
    mutationFn: async (mode: StockMode) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ stock_mode: mode }).eq("id", productId);
      if (error) throw error;
      if (selfRow?.lineStock?.id) {
        const shouldTrack = mode === "product";
        if (selfRow.lineStock.inventory_tracked !== shouldTrack) {
          const { error: sErr } = await supabase
            .from("product_stocks")
            .update({ inventory_tracked: shouldTrack })
            .eq("id", selfRow.lineStock.id);
          if (sErr) throw sErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Mode de stock mis à jour.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour."),
  });
}

function useToggleAffectsStock(establishmentId: string, organizationId: string, invalidate: () => void) {
  return useMutation({
    mutationFn: async ({
      compositionId,
      componentProductId,
      enabled,
    }: {
      compositionId: string;
      componentProductId: string;
      enabled: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_compositions")
        .update({ affects_stock: enabled })
        .eq("id", compositionId);
      if (error) throw error;
      if (!enabled) return;

      const { data: selfComp } = await supabase
        .from("product_compositions")
        .select("id")
        .eq("main_product_id", componentProductId)
        .eq("component_product_id", componentProductId)
        .eq("deleted", false)
        .maybeSingle();

      let selfCompId = selfComp?.id;
      if (!selfCompId) {
        const { data: newComp, error: cErr } = await supabase
          .from("product_compositions")
          .insert({
            main_product_id: componentProductId,
            component_product_id: componentProductId,
            establishment_id: establishmentId,
            organization_id: organizationId,
            composition_kind: "recipe",
            default_quantity: 1,
            show_in_customization: false,
            is_required: false,
            deleted: false,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        selfCompId = newComp.id;
      }

      const { data: existingStock } = await supabase
        .from("product_stocks")
        .select("id, inventory_tracked")
        .eq("product_composition_id", selfCompId)
        .eq("establishment_id", establishmentId)
        .maybeSingle();

      if (!existingStock) {
        const { error: sErr } = await supabase.from("product_stocks").insert({
          ...defaultProductStockInsert(selfCompId, establishmentId, organizationId),
          inventory_tracked: true,
        });
        if (sErr) throw sErr;
      } else if (!existingStock.inventory_tracked) {
        const { error: sErr } = await supabase
          .from("product_stocks")
          .update({ inventory_tracked: true })
          .eq("id", existingStock.id);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => {
      toast.success("Ingrédient mis à jour.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour."),
  });
}

function StockModeSelector({
  mode,
  onChange,
  pending,
}: {
  mode: StockMode;
  onChange: (m: StockMode) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mode de gestion du stock</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={mode}
          onValueChange={(v) => onChange(v as StockMode)}
          disabled={pending}
          className="space-y-2"
        >
          {MODES.map((m) => (
            <label
              key={m.value}
              htmlFor={`mode-${m.value}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === m.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem id={`mode-${m.value}`} value={m.value} className="mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {m.icon} {m.label}
                </p>
                <p className="text-muted-foreground text-xs">{m.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

function IngredientsSection({
  compositionStockRows,
  establishmentId,
  toggleMutation,
}: {
  compositionStockRows: CompositionStockRow[];
  establishmentId: string;
  toggleMutation: ReturnType<typeof useToggleAffectsStock>;
}) {
  const productHref = useProductHref(establishmentId);
  const recipeRows = compositionStockRows.filter(
    (r) => !r.isSelfComposition && isRecipeCompositionKind(r.composition.composition_kind),
  );

  if (recipeRows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">
            Aucun ingrédient dans la fiche technique. Ajoutez des ingrédients depuis l&apos;onglet Recette.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ingrédients à décrémenter à la vente</CardTitle>
        <CardDescription>
          Cochez les ingrédients dont le stock doit baisser à chaque vente de ce produit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {recipeRows.map((csr) => {
          const c = csr.composition;
          const qtyPerSale = (c.default_quantity ?? 1) * (c.conversion_factor ?? 1);
          const unit = c.quantity_unit ?? c.component?.portion_unit ?? "";
          const stock = csr.componentIdentityStock;
          const pending = toggleMutation.isPending;

          return (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-md py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.component?.name ?? "—"}</span>
                  <Link
                    href={productHref(c.component_product_id)}
                    className="text-muted-foreground hover:text-primary shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  −{qtyPerSale} {unit} par vente
                  {c.affects_stock && stock != null && (
                    <span className="ml-2">
                      · stock actuel : {stock.current_stock} {stock.unit}
                    </span>
                  )}
                </p>
              </div>
              <Switch
                checked={c.affects_stock}
                disabled={pending}
                onCheckedChange={(v) =>
                  toggleMutation.mutate({
                    compositionId: c.id,
                    componentProductId: c.component_product_id,
                    enabled: v,
                  })
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ProductStockPanel({
  product,
  compositionStockRows,
  productId,
  establishmentId,
  organizationId,
  isIngredient = false,
}: {
  product: ProductWithCategoryName;
  compositionStockRows: CompositionStockRow[];
  productId: string;
  establishmentId: string;
  organizationId: string;
  isIngredient?: boolean;
}) {
  const invalidate = useInvalidate(productId, establishmentId, organizationId);
  const selfRow = compositionStockRows.find((r) => r.isSelfComposition);

  const setModeMutation = useSetStockMode(productId, selfRow, invalidate);
  const toggleMutation = useToggleAffectsStock(establishmentId, organizationId, invalidate);

  if (isIngredient) {
    return (
      <div className="space-y-4">
        <ProductSection
          selfRow={selfRow}
          productId={productId}
          establishmentId={establishmentId}
          organizationId={organizationId}
          invalidate={invalidate}
          viaAchats
        />
        <DeclinationGeneratorCard
          ingredient={{
            id: productId,
            name: product.name,
            category_id: product.category_id,
            vat_rate_id: product.vat_rate_id,
            portion_unit: product.portion_unit,
          }}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      </div>
    );
  }

  const currentMode = (product.stock_mode as StockMode | null) ?? "none";

  return (
    <div className="space-y-4">
      <StockModeSelector
        mode={currentMode}
        onChange={(m) => setModeMutation.mutate(m)}
        pending={setModeMutation.isPending}
      />

      {currentMode === "product" && (
        <ProductSection
          selfRow={selfRow}
          productId={productId}
          establishmentId={establishmentId}
          organizationId={organizationId}
          invalidate={invalidate}
        />
      )}

      {currentMode === "ingredients" && (
        <IngredientsSection
          compositionStockRows={compositionStockRows}
          establishmentId={establishmentId}
          toggleMutation={toggleMutation}
        />
      )}

      <CreateIngredientFromProductCard
        product={{
          id: productId,
          name: product.name,
          category_id: product.category_id,
          vat_rate_id: product.vat_rate_id,
        }}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
    </div>
  );
}
