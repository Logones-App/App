"use client";

import { useEffect, useState } from "react";

import { Loader2, Package, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { ProductModal } from "./product-modal";
import { type CrmProduct, getCategoryConfig, getPriceTypeSuffix } from "./products-types";

function fmtPrice(price: number, suffix: string) {
  return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €${suffix ? ` ${suffix}` : ""}`;
}

export function ProductsContent() {
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<CrmProduct | null>(null);

  async function loadProducts() {
    const supabase = createClient();
    const { data } = await supabase.from("crm_products").select("*").eq("deleted", false).order("name");
    setProducts((data ?? []) as unknown as CrmProduct[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function handleToggleActive(product: CrmProduct) {
    const supabase = createClient();
    const { error } = await supabase
      .from("crm_products")
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      void loadProducts();
    }
  }

  function openCreate() {
    setSelected(null);
    setShowModal(true);
  }

  function openEdit(product: CrmProduct) {
    setSelected(product);
    setShowModal(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {products.length} produit{products.length > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau produit
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <Package className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucun produit dans le catalogue</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            Créer le premier produit
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const cat = getCategoryConfig(product.category);
            const suffix = getPriceTypeSuffix(product.price_type);
            return (
              <Card key={product.id} className={product.is_active ? "" : "opacity-60"}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{product.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={product.is_active ? "Désactiver" : "Activer"}
                        onClick={() => void handleToggleActive(product)}
                      >
                        <Power
                          className={`h-3.5 w-3.5 ${product.is_active ? "text-green-600" : "text-muted-foreground"}`}
                        />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(product)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge className={`border-0 text-xs ${cat.color}`}>{cat.label}</Badge>
                    <span className="text-sm font-semibold">{fmtPrice(product.unit_price, suffix)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProductModal
        open={showModal}
        product={selected}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          void loadProducts();
        }}
      />
    </>
  );
}
