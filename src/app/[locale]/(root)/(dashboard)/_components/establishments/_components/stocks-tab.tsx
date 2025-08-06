"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEstablishmentProductsWithStocks } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

interface StocksTabProps {
  establishmentId: string;
  organizationId: string;
}

function getStockStatus(stock: any) {
  if (!stock) return { className: "bg-muted/30", isLow: false, isCritical: false };

  const isLow = stock.low_stock_threshold != null && stock.current_stock <= stock.low_stock_threshold;
  const isCritical = stock.critical_stock_threshold != null && stock.current_stock <= stock.critical_stock_threshold;

  if (isCritical) return { className: "bg-red-100", isLow, isCritical };
  if (isLow) return { className: "bg-yellow-100", isLow, isCritical };
  return { className: "bg-muted/30", isLow, isCritical };
}

function StockInfo({ stock }: { stock: any }) {
  return (
    <div className="text-xs">
      Stock : {stock?.current_stock ?? <span className="text-muted-foreground italic">?</span>}
      {stock?.low_stock_threshold && (
        <span className="text-muted-foreground ml-2">(Seuil bas: {stock.low_stock_threshold})</span>
      )}
      {stock?.critical_stock_threshold && (
        <span className="text-muted-foreground ml-2">(Seuil critique: {stock.critical_stock_threshold})</span>
      )}
    </div>
  );
}

function StockProductItem({ product }: { product: Tables<"products"> }) {
  const stock = product.stock;
  const { className } = getStockStatus(stock);

  return (
    <div className={`flex items-center gap-4 rounded border p-2 ${className}`}>
      <div className="flex-1">
        <div className="font-medium">{product.name}</div>
        {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
      </div>
      <StockInfo stock={stock} />
    </div>
  );
}

export function StocksTab({ establishmentId, organizationId }: StocksTabProps) {
  const { data: productsWithStocks, isLoading } = useEstablishmentProductsWithStocks(establishmentId, organizationId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!productsWithStocks || productsWithStocks.length === 0)
    return <p className="text-muted-foreground">Aucun produit en stock dans cet établissement.</p>;

  return (
    <div className="space-y-2">
      {productsWithStocks.map((product: Tables<"products">) => (
        <StockProductItem key={product.id} product={product} />
      ))}
    </div>
  );
}
