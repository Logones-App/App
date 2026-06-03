"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProductEstablishmentDashboard(productId, establishmentId, organizationId);

  const productNotFound = !isLoading && !error && data?.product === null;

  useEffect(() => {
    if (!productNotFound) return;
    void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
    toast.error("Ce produit n'est plus disponible (archivé ou supprimé).");
    router.replace(backHref);
  }, [productNotFound, queryClient, organizationId, router, backHref]);

  const backButton = (
    <Button variant="outline" size="sm" asChild className="mb-2 w-fit">
      <Link href={backHref}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste
      </Link>
    </Button>
  );

  if (isLoading || productNotFound) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement du produit…</span>
        </div>
      </div>
    );
  }

  if (error) {
    const raw: unknown = error;
    const msg =
      raw instanceof Error
        ? raw.message
        : typeof raw === "object" && raw !== null && "message" in raw
          ? String((raw as { message: unknown }).message)
          : JSON.stringify(raw);
    return (
      <div className="space-y-6">
        {backButton}
        <Alert variant="destructive">
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { product, compositions, compositionStockRows, menuProductPricing } = data ?? {
    product: null,
    compositions: [],
    compositionStockRows: [],
    menuProductPricing: [],
  };

  if (!product) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {backButton}
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground text-sm">
          Tableau de bord par établissement : options, compositions et stocks correspondent à cet établissement
          uniquement. Le prix catalogue et la fiche produit viennent du catalogue organisation.
        </p>
      </div>

      <ProductEstablishmentDashboardTabs
        product={product}
        establishmentId={establishmentId}
        organizationId={organizationId}
        backHref={backHref}
        compositions={compositions}
        compositionStockRows={compositionStockRows}
        menuProductPricing={menuProductPricing}
      />
    </div>
  );
}
