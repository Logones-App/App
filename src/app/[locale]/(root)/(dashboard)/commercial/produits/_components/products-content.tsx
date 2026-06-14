"use client";

import { useEffect, useState } from "react";

import { Loader2, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { type CrmProduct, getCategoryConfig, getPriceTypeSuffix } from "./products-types";

function fmtPrice(price: number, suffix: string) {
  return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €${suffix ? ` ${suffix}` : ""}`;
}

export function ProductsContent() {
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("crm_products")
        .select("*")
        .eq("deleted", false)
        .eq("is_active", true)
        .order("category")
        .order("name");
      setProducts((data ?? []) as unknown as CrmProduct[]);
      setIsLoading(false);
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <Package className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Aucun produit disponible dans le catalogue</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const cat = getCategoryConfig(product.category);
        const suffix = getPriceTypeSuffix(product.price_type);
        return (
          <Card key={product.id}>
            <CardContent className="pt-4">
              <p className="truncate text-sm font-medium">{product.name}</p>
              {product.description && (
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{product.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <Badge className={`border-0 text-xs ${cat.color}`}>{cat.label}</Badge>
                <span className="text-sm font-semibold">{fmtPrice(product.unit_price, suffix)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
