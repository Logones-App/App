"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useMenuProducts } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

interface MenuProductsListProps {
  menuId: string;
}

export function MenuProductsList({ menuId }: MenuProductsListProps) {
  const { data: products, isLoading, isError } = useMenuProducts(menuId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError) return <p className="text-destructive text-xs">Erreur lors du chargement des produits du menu.</p>;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground text-xs">Aucun produit dans ce menu.</p>;

  return (
    <div className="mt-2 space-y-2">
      {products.map((product: Tables<"products">) => (
        <div key={product.id} className="bg-muted/50 flex items-center gap-4 rounded border p-2">
          <div className="flex-1">
            <div className="font-medium">{product.name}</div>
            {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
          </div>
          <div className="text-sm font-semibold">
            {product.price != null ? (
              product.price + " €"
            ) : (
              <span className="text-muted-foreground italic">(prix ?)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
