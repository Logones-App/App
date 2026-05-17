"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import {
  MENU_PRICING_STRATEGY_LABELS,
  menuPricingStrategyLabel,
  resolveEffectiveProductPrice,
} from "@/lib/product-pricing-utils";
import type { MenuProductPricingJoin, ProductWithCategoryName } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const DASHBOARD_KEY = "product-establishment-dashboard" as const;

function invalidateProductPricingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  p: {
    productId: string;
    establishmentId: string;
    organizationId: string;
    menuIds: string[];
  },
) {
  void queryClient.invalidateQueries({
    queryKey: [DASHBOARD_KEY, p.productId, p.establishmentId, p.organizationId],
  });
  void queryClient.invalidateQueries({ queryKey: ["organization-products", p.organizationId] });
  void queryClient.invalidateQueries({
    queryKey: ["establishment-products-with-stocks", p.establishmentId, p.organizationId],
  });
  void queryClient.invalidateQueries({
    queryKey: ["establishment-products-not-in-menus", p.establishmentId, p.organizationId],
  });
  for (const mid of p.menuIds) {
    void queryClient.invalidateQueries({ queryKey: ["menu-products", mid] });
  }
  void queryClient.invalidateQueries({ queryKey: ["menu-category-grid-items"] });
}

export function PrixPanel({
  product,
  productId,
  establishmentId,
  organizationId,
  menuProductPricing,
}: {
  product: ProductWithCategoryName;
  productId: string;
  establishmentId: string;
  organizationId: string;
  menuProductPricing: MenuProductPricingJoin[];
}) {
  const queryClient = useQueryClient();
  const menuIds = [...new Set(menuProductPricing.map((x) => x.menu?.id).filter(Boolean) as string[])];

  const [catalogInput, setCatalogInput] = useState(String(product.price));
  useEffect(() => {
    setCatalogInput(String(product.price));
  }, [product.price]);

  const catalogMutation = useMutation({
    mutationFn: async (price: number) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ price })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix catalogue enregistré.");
      invalidateProductPricingQueries(queryClient, { productId, establishmentId, organizationId, menuIds });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const parsePrice = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Prix catalogue</CardTitle>
          <CardDescription>
            Prix de base du produit (organisation), utilisé selon la stratégie de chaque menu
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Montant (EUR)</p>
            <Input
              className="w-40 tabular-nums"
              type="text"
              inputMode="decimal"
              value={catalogInput}
              onChange={(e) => setCatalogInput(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={catalogMutation.isPending}
            onClick={() => {
              const t = catalogInput.trim();
              const n = Number(t.replace(",", "."));
              if (!Number.isFinite(n) || n < 0) {
                toast.error("Montant invalide.");
                return;
              }
              catalogMutation.mutate(n);
            }}
          >
            Enregistrer
          </Button>
          <p className="text-muted-foreground w-full text-sm tabular-nums">
            Actuellement affiché : {eur.format(product.price)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prix par menu</CardTitle>
          <CardDescription>
            Chaque menu définit une stratégie (<span className="font-medium">menus.pricing_strategy</span>). La colonne
            « Prix menu » correspond à <span className="font-medium">menus_products.price</span>. Les changements sont
            journalisés dans <span className="font-medium">menus_products_price_history</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MenuPricingLegend />
          {menuProductPricing.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ce produit n&apos;apparaît dans aucun menu actif de cet établissement.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu</TableHead>
                    <TableHead>Stratégie menu</TableHead>
                    <TableHead>Prix menu</TableHead>
                    <TableHead>Prix affiché</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuProductPricing.map(({ menuProduct, menu }) => (
                    <MenuPricingRow
                      key={menuProduct.id}
                      product={product}
                      menuProduct={menuProduct}
                      menu={menu}
                      productId={productId}
                      establishmentId={establishmentId}
                      organizationId={organizationId}
                      menuIds={menuIds}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MenuPricingLegend() {
  return (
    <div className="bg-muted/40 rounded-md border p-3 text-xs">
      <p className="font-medium">Stratégies</p>
      <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
        <li>
          <span className="text-foreground font-medium">catalog_only</span> —{" "}
          {MENU_PRICING_STRATEGY_LABELS.catalog_only}
        </li>
        <li>
          <span className="text-foreground font-medium">menu_price_fallback_catalog</span> —{" "}
          {MENU_PRICING_STRATEGY_LABELS.menu_price_fallback_catalog}
        </li>
        <li>
          <span className="text-foreground font-medium">menu_price_required</span> —{" "}
          {MENU_PRICING_STRATEGY_LABELS.menu_price_required}
        </li>
      </ul>
    </div>
  );
}

function MenuPricingRow({
  product,
  menuProduct,
  menu,
  productId,
  establishmentId,
  organizationId,
  menuIds,
}: {
  product: ProductWithCategoryName;
  menuProduct: Tables<"menus_products">;
  menu: MenuProductPricingJoin["menu"];
  productId: string;
  establishmentId: string;
  organizationId: string;
  menuIds: string[];
}) {
  const queryClient = useQueryClient();
  const strategy = menu?.pricing_strategy ?? "menu_price_fallback_catalog";
  const strategyLabel = menuPricingStrategyLabel(strategy);

  const [edit, setEdit] = useState(String(menuProduct.price ?? ""));
  useEffect(() => {
    setEdit(String(menuProduct.price ?? ""));
  }, [menuProduct.price, menuProduct.id]);

  const effective = resolveEffectiveProductPrice(product.price, menuProduct.price, strategy);

  const updateMutation = useMutation({
    mutationFn: async ({ nextPrice }: { nextPrice: number | null }) => {
      const supabase = createClient();
      const prev = menuProduct.price;
      const changed = prev !== nextPrice;
      const { error } = await supabase.from("menus_products").update({ price: nextPrice }).eq("id", menuProduct.id);
      if (error) throw error;
      if (changed && nextPrice !== null && nextPrice !== undefined) {
        await insertMenusProductPriceHistoryRow(supabase, menuProduct.id, nextPrice, "product_dashboard");
      }
    },
    onSuccess: () => {
      toast.success("Prix menu enregistré.");
      invalidateProductPricingQueries(queryClient, { productId, establishmentId, organizationId, menuIds });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").update({ deleted: true }).eq("id", menuProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit retiré du menu (liaison désactivée).");
      invalidateProductPricingQueries(queryClient, { productId, establishmentId, organizationId, menuIds });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">{menu?.name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] text-xs">{strategyLabel}</TableCell>
      <TableCell className="tabular-nums">
        <Input
          className="h-8 max-w-[7rem] tabular-nums"
          type="text"
          inputMode="decimal"
          value={edit}
          onChange={(e) => setEdit(e.target.value)}
        />
      </TableCell>
      <TableCell className="font-medium tabular-nums">{eur.format(effective.amount)}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant={effective.source === "menu" ? "default" : "secondary"}>
            {effective.source === "menu" ? "Menu" : "Catalogue"}
          </Badge>
          {effective.missingMenuPrice && <Badge variant="destructive">Prix menu manquant</Badge>}
          <span className="text-muted-foreground text-xs">{effective.ruleLabel}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={updateMutation.isPending}
            onClick={() => {
              const t = edit.trim();
              let nextPrice: number | null;
              if (t === "") {
                nextPrice = null;
              } else {
                const n = Number(t.replace(",", "."));
                if (!Number.isFinite(n) || n < 0) {
                  toast.error("Montant invalide (champ vide = effacer le prix menu).");
                  return;
                }
                nextPrice = n;
              }
              updateMutation.mutate({ nextPrice });
            }}
          >
            Enregistrer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={removeMutation.isPending}
            onClick={() => {
              if (!confirm("Retirer ce produit du menu ? Les tuiles grille existantes peuvent encore le référencer.")) {
                return;
              }
              removeMutation.mutate();
            }}
          >
            Retirer du menu
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
