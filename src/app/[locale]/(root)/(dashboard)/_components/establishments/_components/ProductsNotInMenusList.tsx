"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEstablishmentProductsNotInMenus } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

interface ProductsNotInMenusListProps {
  establishmentId: string;
  organizationId: string;
}

export function ProductsNotInMenusList({ establishmentId, organizationId }: ProductsNotInMenusListProps) {
  const { data: products, isLoading, isError } = useEstablishmentProductsNotInMenus(establishmentId, organizationId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError) return <p className="text-destructive text-xs">Erreur lors du chargement des produits hors menu.</p>;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground text-xs">Aucun produit hors menu.</p>;

  return (
    <div className="mt-2 space-y-2">
      {products.map((product: Tables<"products">) => (
        <div key={product.id} className="bg-muted/30 flex items-center gap-4 rounded border p-2">
          <div className="flex-1">
            <div className="font-medium">{product.name}</div>
            {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
          </div>
          <div className="text-xs">Prix : {product.price}€</div>
        </div>
      ))}
    </div>
  );
}
