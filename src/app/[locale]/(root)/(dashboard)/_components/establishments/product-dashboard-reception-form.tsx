"use client";

import { useState } from "react";

import { Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ReceptionHistoryTable } from "./product-dashboard-reception-history";
import { ReceptionModal } from "./product-dashboard-reception-modal";

export function PurchaseReceptionCard({
  productId,
  organizationId,
  establishmentId,
  productStockId,
  unit,
  currentStock,
}: {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string | null;
  unit: string | null;
  currentStock: number;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Réceptions fournisseur
          </CardTitle>
          <CardDescription>
            Stock actuel : <strong>{currentStock}</strong>
            {unit ? ` ${unit}` : ""}
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle réception
        </Button>
      </CardHeader>
      <CardContent>
        {productStockId ? (
          <ReceptionHistoryTable
            productId={productId}
            organizationId={organizationId}
            establishmentId={establishmentId}
            productStockId={productStockId}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune réception. La première réception définira l&apos;unité de gestion du stock.
          </p>
        )}
      </CardContent>

      {showModal && (
        <ReceptionModal
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId}
          productStockId={productStockId}
          stockUnit={unit}
          currentStock={currentStock}
          onClose={() => setShowModal(false)}
        />
      )}
    </Card>
  );
}
