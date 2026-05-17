"use client";

import Link from "next/link";

import { ArrowLeft, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProductEstablishmentDashboard } from "@/lib/queries/product-establishment-dashboard";

import { ProductEstablishmentDashboardTabs } from "./product-establishment-dashboard-panels";

type Props = {
  productId: string;
  establishmentId: string;
  organizationId: string;
  backHref: string;
};

export function ProductEstablishmentDashboard({ productId, establishmentId, organizationId, backHref }: Props) {
  const { data, isLoading, error } = useProductEstablishmentDashboard(productId, establishmentId, organizationId);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement du produit…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error instanceof Error ? error.message : String(error)}</AlertDescription>
      </Alert>
    );
  }

  const { product, options, compositions, compositionStockRows, menuProductPricing } = data ?? {
    product: null,
    options: [],
    compositions: [],
    compositionStockRows: [],
    menuProductPricing: [],
  };

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Alert>
          <AlertDescription>Produit introuvable ou non accessible pour cette organisation.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="outline" size="sm" asChild className="mb-2 w-fit">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground text-sm">
          Tableau de bord par établissement : options, compositions et stocks correspondent à cet établissement
          uniquement. Le prix catalogue et la fiche produit viennent du catalogue organisation.
        </p>
      </div>

      <ProductEstablishmentDashboardTabs
        product={product}
        productId={productId}
        establishmentId={establishmentId}
        organizationId={organizationId}
        backHref={backHref}
        options={options}
        compositions={compositions}
        compositionStockRows={compositionStockRows}
        menuProductPricing={menuProductPricing}
      />
    </div>
  );
}
