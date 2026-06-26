"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Package, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type StockMovementRow, useProductStockMovements } from "@/lib/queries/stock-movement-queries";

import { ReceptionModal } from "./product-dashboard-reception-modal";

function ReceptionHistory({ movements }: { movements: StockMovementRow[] }) {
  const purchases = movements.filter((m) => m.movement_type === "purchase").slice(0, 10);
  if (purchases.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">Dernières réceptions</p>
      {purchases.map((m) => {
        const totalHT = m.unit_cost != null ? Math.abs(m.quantity) * m.unit_cost : null;
        return (
          <div key={m.id} className="flex items-center justify-between gap-2 py-1 text-xs">
            <span className="text-muted-foreground tabular-nums">
              {m.created_at ? format(parseISO(m.created_at), "d MMM yyyy", { locale: fr }) : "—"}
            </span>
            <span className="font-medium tabular-nums">
              +{m.quantity} {m.unit ?? ""}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {totalHT != null
                ? totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
                : "—"}
            </span>
            {m.notes && (
              <Badge variant="outline" className="max-w-[140px] truncate text-xs">
                {m.notes}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const { data: movements = [] } = useProductStockMovements(productId, organizationId, establishmentId);

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
        {productStockId && (
          <Button type="button" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle réception
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!productStockId && (
          <p className="text-muted-foreground text-sm">
            Configurez d&apos;abord l&apos;unité de stock dans l&apos;onglet Stock.
          </p>
        )}
        {productStockId && <ReceptionHistory movements={movements} />}
      </CardContent>

      {showModal && productStockId && (
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
