"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useOrganizationProducts,
  useEstablishmentMenus,
  useEstablishmentProductsWithStocks,
} from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

import { ProductMenusList } from "./product-menus-list";

interface ProductsTabProps {
  establishmentId: string;
  organizationId: string;
}

export function ProductsTab({ establishmentId, organizationId }: ProductsTabProps) {
  const { data: products, isLoading: loadingProducts } = useOrganizationProducts(organizationId);
  const { data: menus, isLoading: loadingMenus } = useEstablishmentMenus(establishmentId, organizationId);
  const { data: productsWithStocks, isLoading: loadingStocks } = useEstablishmentProductsWithStocks(
    establishmentId,
    organizationId,
  );

  // Pour chaque menu, récupérer les produits associés (avec prix)
  // On prépare une map menuId -> produits du menu
  const menusWithProducts = (menus ?? []).map((menu: Tables<"menus">) => {
    // On utilise le hook useMenuProducts pour chaque menu
    // (pour la démo, on suppose que les produits sont déjà chargés)
    // En production, il faudrait optimiser avec un hook global ou une requête jointe
    return {
      ...menu,
      products: [], // à remplir si besoin
    };
  });

  if (loadingProducts || loadingMenus || loadingStocks) return <Skeleton className="h-8 w-full" />;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground">Aucun produit dans l&apos;organisation.</p>;

  return (
    <div className="space-y-2">
      {products.map((product: Tables<"products">) => {
        const stock = (productsWithStocks ?? []).find((p: Tables<"products">) => p.id === product.id)?.stock;
        return (
          <div key={product.id} className="bg-muted/30 flex items-center gap-4 rounded border p-2">
            <div className="flex-1">
              <div className="font-medium">{product.name}</div>
              {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
              <ProductMenusList menus={menusWithProducts} />
            </div>
            <div className="text-xs">
              Stock : {stock?.current_stock ?? <span className="text-muted-foreground italic">?</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
