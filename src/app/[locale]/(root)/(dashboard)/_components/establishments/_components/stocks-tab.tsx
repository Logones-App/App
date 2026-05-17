"use client";

import { useCallback } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEstablishmentProductsWithStocks } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";
import type { ProductWithStock } from "@/lib/types/database-extensions";

import { StockQuantities } from "../product-composition-dashboard-blocks";
import { ProductStockQuickAdjust } from "../product-stock-quick-adjust";

interface StocksTabProps {
  establishmentId: string;
  organizationId: string;
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

function getStockStatus(stock: Tables<"product_stocks"> | null) {
  if (!stock) return { rowClass: "bg-muted/30", isLow: false, isCritical: false };

  const isLow = stock.low_stock_threshold != null && stock.current_stock <= stock.low_stock_threshold;
  const isCritical = stock.critical_stock_threshold != null && stock.current_stock <= stock.critical_stock_threshold;

  if (isCritical) {
    return { rowClass: "bg-red-100 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/60", isLow, isCritical };
  }
  if (isLow) {
    return {
      rowClass: "bg-yellow-100 dark:bg-yellow-950/40 border-yellow-200/80 dark:border-yellow-900/60",
      isLow,
      isCritical,
    };
  }
  return { rowClass: "bg-muted/20 border-transparent", isLow, isCritical };
}

function StockLineBlock({
  item,
  productId,
  establishmentId,
  organizationId,
}: {
  item: ProductWithStock["stockLines"][number];
  productId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const { stock, isSelfCompositionLine } = item;
  const { rowClass } = getStockStatus(stock);

  return (
    <div className={`space-y-1 rounded-md border p-2 ${rowClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isSelfCompositionLine ? "default" : "secondary"}>
          {isSelfCompositionLine ? "Unité de vente" : "Recette / pool"}
        </Badge>
        {stock.inventory_tracked ? (
          <Badge variant="outline">Suivi inventaire</Badge>
        ) : (
          <span className="text-muted-foreground">Non suivi</span>
        )}
      </div>
      <StockQuantities stock={stock} />
      {(stock.low_stock_threshold != null || stock.critical_stock_threshold != null) && (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {stock.critical_stock_threshold != null && (
            <span className="mr-2">Critique ≤ {stock.critical_stock_threshold}</span>
          )}
          {stock.low_stock_threshold != null && <span>Bas ≤ {stock.low_stock_threshold}</span>}
        </p>
      )}
      <ProductStockQuickAdjust
        stock={stock}
        productId={productId}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
    </div>
  );
}

function StockProductItem({
  product,
  productHref,
  establishmentId,
  organizationId,
}: {
  product: ProductWithStock;
  productHref: string;
  establishmentId: string;
  organizationId: string;
}) {
  const { stockLines, stock } = product;
  const several = stockLines.length > 1;

  return (
    <div className="bg-card space-y-2 rounded-lg border p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={productHref}
          className="text-foreground hover:text-primary inline-flex max-w-full items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          <span className="truncate">{product.name}</span>
          <ExternalLink className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
        <span className="text-muted-foreground text-xs tabular-nums">
          {stockLines.length} fiche{stockLines.length > 1 ? "s" : ""}
        </span>
      </div>
      {product.description && <p className="text-muted-foreground text-xs">{product.description}</p>}
      {several && stock ? (
        <p className="text-muted-foreground border-b pb-2 text-xs">
          <span className="text-foreground font-medium">Lecture rapide : </span>
          <span className="tabular-nums">
            {stock.current_stock} {stock.unit}
            {stock.inventory_tracked ? " (ligne prioritaire suivie)" : ""}
          </span>
        </p>
      ) : null}
      <div className="space-y-2">
        {stockLines.map((line) => (
          <StockLineBlock
            key={line.stock.id}
            item={line}
            productId={product.id}
            establishmentId={establishmentId}
            organizationId={organizationId}
          />
        ))}
      </div>
    </div>
  );
}

export function StocksTab({ establishmentId, organizationId }: StocksTabProps) {
  const { data: productsWithStocks, isLoading } = useEstablishmentProductsWithStocks(establishmentId, organizationId);
  const hrefForProduct = useProductDashboardHref(establishmentId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!productsWithStocks || productsWithStocks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun produit avec fiche <span className="font-medium">product_stocks</span> dans cet établissement (liaison via{" "}
        <span className="font-medium">product_compositions</span>).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Chaque produit peut avoir plusieurs fiches (unité vendue, lignes de recette, pool d&apos;ingrédient). Les seuils
        colorent chaque ligne. Ajustez le <span className="font-medium">stock réel</span> sans quitter la liste ; le nom
        du produit ouvre la fiche établissement (onglet Stock pour le suivi inventaire).
      </p>
      {productsWithStocks.map((product) => (
        <StockProductItem
          key={product.id}
          product={product}
          productHref={hrefForProduct(product.id)}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}
