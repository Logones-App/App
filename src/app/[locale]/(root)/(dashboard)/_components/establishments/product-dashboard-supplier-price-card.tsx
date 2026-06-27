"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeletePurchasePrice } from "@/lib/queries/purchase-price-queries";
import {
  useDeleteSupplierReference,
  useUpdateSupplierReference,
  type SupplierReferenceRow,
} from "@/lib/queries/supplier-queries";
import { toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type ProductSupplierWithName = SupplierReferenceRow & {
  supplier: { id: string; name: string; is_active: boolean } | null;
};

type HistoryRow = {
  id: string;
  unit_cost: number;
  effective_from: string;
  supplier_id: string | null;
  supplier_reference_id: string | null;
};

const HISTORY_PAGE = 5;

function PriceHistory({
  rows,
  portionUnit,
  productId,
  organizationId,
}: {
  rows: HistoryRow[];
  portionUnit: string | null;
  productId: string;
  organizationId: string;
}) {
  const [show, setShow] = useState(false);
  const [limit, setLimit] = useState(HISTORY_PAGE);
  const deleteMutation = useDeletePurchasePrice(productId, organizationId);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Historique ({rows.length} entrée{rows.length > 1 ? "s" : ""})
      </button>
      {show && (
        <div className="mt-1.5 space-y-0.5">
          {rows.slice(0, limit).map((h) => {
            const { value, displayUnit } = toFriendlyUnitCost(h.unit_cost, portionUnit);
            return (
              <div key={h.id} className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
                <span>
                  {eur.format(value)}
                  {displayUnit ? ` / ${displayUnit}` : ""}
                  {" · "}
                  {format(parseISO(h.effective_from), "d MMM yyyy", { locale: fr })}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-destructive"
                  title="Supprimer cette entrée"
                  onClick={() => {
                    if (confirm("Supprimer cette entrée d'historique de prix ?")) deleteMutation.mutate(h.id);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {rows.length > limit && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
              onClick={() => setLimit((v) => v + HISTORY_PAGE)}
            >
              Voir plus ({rows.length - limit} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierPriceDisplay({
  unitPrice,
  orderUnit,
  portionUnit,
  qtyPerOrder,
}: {
  unitPrice: number | null;
  orderUnit: string | null;
  portionUnit: string | null;
  qtyPerOrder: number | null;
}) {
  if (unitPrice == null) {
    return <p className="text-muted-foreground text-xs italic">Prix non renseigné</p>;
  }
  const rawUnit = orderUnit ?? portionUnit;
  const { value: displayValue, displayUnit } = toFriendlyUnitCost(unitPrice, rawUnit);
  const qtyLabel = qtyPerOrder != null && qtyPerOrder > 1 ? ` × ${qtyPerOrder}` : "";
  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      {eur.format(displayValue)}
      {displayUnit ? ` / ${displayUnit}` : ""}
      {qtyLabel}
    </p>
  );
}

function SupplierRefChips({
  supplierRef,
  name,
  orderQuantity,
  leadTimeDays,
}: {
  supplierRef: string | null;
  name: string | null;
  orderQuantity: number | null;
  leadTimeDays: number | null;
}) {
  if (!supplierRef && !name && orderQuantity == null && leadTimeDays == null) return null;
  return (
    <>
      {(supplierRef ?? name) && (
        <p className="text-muted-foreground text-xs tabular-nums">
          {supplierRef && <span className="font-mono">{supplierRef}</span>}
          {supplierRef && name && " · "}
          {name}
        </p>
      )}
      {(orderQuantity ?? leadTimeDays) && (
        <p className="text-muted-foreground text-xs">
          {orderQuantity != null && `Min ${orderQuantity}`}
          {orderQuantity != null && leadTimeDays != null && " · "}
          {leadTimeDays != null && `Délai ${leadTimeDays} j`}
        </p>
      )}
    </>
  );
}

function SupplierCardHeader({ supplierName, isActive }: { supplierName: string | null; isActive: boolean | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{supplierName ?? "—"}</span>
      {isActive === false && (
        <Badge variant="secondary" className="text-xs">
          Inactif
        </Badge>
      )}
    </div>
  );
}

export function SupplierPriceCard({
  link,
  productId,
  organizationId,
  portionUnit,
  history,
}: {
  link: ProductSupplierWithName;
  productId: string;
  organizationId: string;
  portionUnit: string | null;
  history: HistoryRow[];
}) {
  const [editLabels, setEditLabels] = useState(false);
  const [refInput, setRefInput] = useState(link.supplier_product_ref ?? "");
  const [nameInput, setNameInput] = useState(link.supplier_product_name ?? "");

  const updateMutation = useUpdateSupplierReference(productId);
  const deleteMutation = useDeleteSupplierReference(productId);

  const supplierHistory = history.filter((h) => h.supplier_reference_id === link.id);

  const handleSaveLabels = () => {
    updateMutation.mutate(
      {
        id: link.id,
        patch: {
          supplier_product_ref: refInput.trim() !== "" ? refInput.trim() : null,
          supplier_product_name: nameInput.trim() !== "" ? nameInput.trim() : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Référence mise à jour.");
          setEditLabels(false);
        },
      },
    );
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <SupplierCardHeader supplierName={link.supplier?.name ?? null} isActive={link.supplier?.is_active ?? null} />
          <SupplierPriceDisplay
            unitPrice={link.unit_price ?? null}
            orderUnit={link.order_unit ?? null}
            portionUnit={portionUnit}
            qtyPerOrder={link.conversion_factor > 1 ? link.conversion_factor : null}
          />
          <SupplierRefChips
            supplierRef={link.supplier_product_ref ?? null}
            name={link.supplier_product_name ?? null}
            orderQuantity={link.min_order_qty ?? null}
            leadTimeDays={link.lead_time_days ?? null}
          />
          <p className="text-muted-foreground/70 text-xs italic">
            Prix modifiable via « Ajouter un prix d&apos;achat ».
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditLabels(true);
              setRefInput(link.supplier_product_ref ?? "");
              setNameInput(link.supplier_product_name ?? "");
            }}
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            onClick={() => {
              if (confirm("Supprimer cette référence fournisseur ?")) deleteMutation.mutate(link.id);
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {editLabels && (
        <div className="mt-3 space-y-2">
          <p className="text-muted-foreground text-xs">Réf. article · Désignation</p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="TG-12345"
              className="w-36 font-mono text-xs"
              autoFocus
            />
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Désignation fournisseur"
              className="min-w-[12rem] flex-1 text-xs"
            />
            <Button type="button" size="sm" onClick={handleSaveLabels} disabled={updateMutation.isPending}>
              OK
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditLabels(false)}>
              ✕
            </Button>
          </div>
        </div>
      )}
      <PriceHistory
        rows={supplierHistory}
        portionUnit={portionUnit}
        productId={productId}
        organizationId={organizationId}
      />
    </div>
  );
}
