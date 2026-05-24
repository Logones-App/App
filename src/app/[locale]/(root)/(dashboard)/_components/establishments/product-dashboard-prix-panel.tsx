"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { History } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import {
  MENU_PRICING_STRATEGY_LABELS,
  menuPricingStrategyLabel,
  resolveEffectiveProductPrice,
} from "@/lib/product-pricing-utils";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type MenuProductPricingJoin,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function CatalogPriceCard({
  product,
  productId,
  organizationId,
  establishmentId,
  menuIds,
}: {
  product: ProductWithCategoryName;
  productId: string;
  organizationId: string;
  establishmentId: string;
  menuIds: string[];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(String(product.price));
  useEffect(() => {
    setDraft(String(product.price));
  }, [product.price]);

  const mutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(draft.replace(",", "."));
      if (!Number.isFinite(price) || price < 0) throw new Error("Prix invalide.");
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ price })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix catalogue mis à jour.");
      invalidateProductPricingQueries(queryClient, { productId, establishmentId, organizationId, menuIds });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix catalogue</CardTitle>
        <CardDescription>
          Prix de référence du produit. Utilisé par les menus en stratégie <strong>catalog_only</strong> ou comme
          fallback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") mutation.mutate();
            }}
            inputMode="decimal"
            placeholder="0,00"
            className="max-w-[8rem] tabular-nums"
          />
          <span className="text-muted-foreground text-sm">€ TTC</span>
          <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
    queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, p.productId, p.establishmentId, p.organizationId],
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
  const menuIds = [...new Set(menuProductPricing.map((x) => x.menu?.id).filter(Boolean) as string[])];

  return (
    <div className="space-y-4">
      <CatalogPriceCard
        product={product}
        productId={productId}
        organizationId={organizationId}
        establishmentId={establishmentId}
        menuIds={menuIds}
      />
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

const SOURCE_LABELS: Record<string, string> = {
  grid_ui: "Grille menu",
  product_dashboard: "Fiche produit",
  product_creation: "Création produit",
  menu_products_table: "Tableau menus",
};

function PriceHistoryDialog({ menuProductId, menuName }: { menuProductId: string; menuName: string }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["menu-price-history", menuProductId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menus_products_price_history")
        .select("*")
        .eq("menus_products_id", menuProductId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Historique des prix">
          <History className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historique des prix — {menuName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Aucun changement de prix enregistré.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Prix TTC</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row, idx) => (
                  <TableRow key={row.id} className={idx === 0 ? "bg-muted/20" : ""}>
                    <TableCell className="text-sm tabular-nums">
                      {format(parseISO(row.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      {idx === 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          actuel
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{eur.format(row.sale_price)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {SOURCE_LABELS[row.source ?? ""] ?? row.source ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
          <PriceHistoryDialog menuProductId={menuProduct.id} menuName={menu?.name ?? "Menu"} />
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
