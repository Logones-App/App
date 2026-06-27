"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductPurchasePriceHistory } from "@/lib/queries/purchase-price-queries";
import { useSupplierReferences } from "@/lib/queries/supplier-queries";

import { ReceptionModal } from "./product-dashboard-reception-modal";
import { SupplierPriceCard, type ProductSupplierWithName } from "./product-dashboard-supplier-price-card";

export function ProductFournisseursPrixPanel({
  productId,
  organizationId,
  portionUnit,
  title = "Fournisseurs & Prix d'achat",
  description = "Le fournisseur ★ est utilisé en priorité pour les calculs de coût matière.",
  establishmentId,
  manageStock = false,
}: {
  productId: string;
  organizationId: string;
  portionUnit: string | null;
  title?: string;
  description?: string;
  /** Ingrédient (onglet Achats) : permet de figer l'unité de gestion + créer la fiche stock à la 1ère référence. */
  establishmentId?: string;
  manageStock?: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: links = [], isLoading } = useSupplierReferences(productId);
  const { data: history = [] } = useProductPurchasePriceHistory(productId, organizationId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-muted-foreground text-sm">Chargement…</p>}

          {!isLoading && links.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun fournisseur associé.</p>
          )}

          {(links as ProductSupplierWithName[]).map((link) => (
            <SupplierPriceCard
              key={link.id}
              link={link}
              productId={productId}
              organizationId={organizationId}
              portionUnit={portionUnit}
              history={history}
            />
          ))}

          <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un prix d&apos;achat
          </Button>
        </CardContent>
      </Card>

      {showAdd && (
        <ReceptionModal
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId ?? ""}
          productStockId={null}
          stockUnit={portionUnit}
          currentStock={0}
          mode="price"
          manageStock={manageStock}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
