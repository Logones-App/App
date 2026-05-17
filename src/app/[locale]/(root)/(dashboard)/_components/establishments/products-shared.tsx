"use client";

import { useMemo } from "react";

import { usePathname } from "next/navigation";

import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstablishmentCategories, useOrganizationProducts } from "@/lib/queries/establishments";

import { StocksTab } from "./_components/stocks-tab";
import { BackToEstablishmentButton } from "./back-to-establishment-button";
import { ProductsListTable } from "./products-list-table";

export function ProductsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const pathname = usePathname();
  const { data: products, isLoading, error } = useOrganizationProducts(organizationId);
  const { data: establishmentCategories = [] } = useEstablishmentCategories(establishmentId, organizationId);

  const categoryById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of establishmentCategories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [establishmentCategories]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des produits…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : String(error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-establishment-id={establishmentId}>
      <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground">
            Catalogue de l&apos;organisation — produits et catégories de cet établissement. Gérez les catégories depuis
            le tableau (nouvelle catégorie, modifier, supprimer). « Nouveau produit » crée une fiche ; la fiche
            établissement sert aux options, compositions et menus.
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalogue" className="w-full gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="stocks">Stocks établissement</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogue" className="mt-4">
          <ProductsListTable
            products={products ?? []}
            establishmentCategories={establishmentCategories}
            categoryById={categoryById}
            establishmentId={establishmentId}
            organizationId={organizationId}
            basePath={pathname.replace(/\/$/, "")}
          />
        </TabsContent>
        <TabsContent value="stocks" className="mt-4">
          <StocksTab establishmentId={establishmentId} organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
