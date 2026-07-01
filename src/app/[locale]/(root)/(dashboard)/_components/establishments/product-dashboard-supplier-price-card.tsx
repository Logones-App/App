"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeletePurchasePrice } from "@/lib/queries/purchase-price-queries";
import {
  useActiveSuppliers,
  useDeleteSupplierReference,
  useUpdateSupplierReference,
  type SupplierReferenceRow,
} from "@/lib/queries/supplier-queries";
import { toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

import { ReferencePhraseFields } from "./product-dashboard-reception-modal-fields";
import {
  A_LA_PIECE,
  BASIS_PACK,
  computeReferenceUnits,
  parsePositive,
  referenceToForm,
  VRAC,
} from "./product-dashboard-reception-modal-parts";

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

function ReferenceEditForm({
  link,
  productId,
  portionUnit,
  onDone,
}: {
  link: ProductSupplierWithName;
  productId: string;
  portionUnit: string | null;
  onDone: () => void;
}) {
  const t = useTranslations("units");
  const updateMutation = useUpdateSupplierReference(productId);
  const { data: suppliers = [] } = useActiveSuppliers(link.organization_id);
  const init = referenceToForm(link);
  const [supplierId, setSupplierId] = useState(link.supplier_id);
  const [packaging, setPackaging] = useState(init.packaging);
  const [contenanceStr, setContenanceStr] = useState(init.contenanceStr);
  const [priceStr, setPriceStr] = useState(init.priceStr);
  const [priceBasis, setPriceBasis] = useState(init.priceBasis);
  const [designation, setDesignation] = useState(link.supplier_product_name ?? "");
  const [refArticle, setRefArticle] = useState(link.supplier_product_ref ?? "");
  const stockUnit = portionUnit ?? "";

  // L'unité de stock est figée (product_stocks.unit) → non modifiable ici. Le reste est libre.
  const onPackagingChange = (v: string) => {
    setPackaging(v);
    setPriceBasis(v === VRAC ? "" : BASIS_PACK);
  };

  const pu = parsePositive(priceStr);
  const contenance = parsePositive(contenanceStr) ?? 1;
  const needsContenance = packaging !== VRAC && packaging !== A_LA_PIECE;
  const canSave =
    pu != null && stockUnit !== "" && priceBasis !== "" && (!needsContenance || parsePositive(contenanceStr) != null);

  const handleSave = () => {
    const ru = computeReferenceUnits({ packaging, contenance, stockUnit, priceValue: pu as number, priceBasis });
    updateMutation.mutate(
      {
        id: link.id,
        patch: {
          supplier_id: supplierId,
          order_unit: ru.orderUnit,
          conversion_factor: ru.conversionFactor,
          unit_price: ru.unitPrice,
          packaging: ru.packaging,
          supplier_product_name: designation.trim() !== "" ? designation.trim() : null,
          supplier_product_ref: refArticle.trim() !== "" ? refArticle.trim() : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Référence mise à jour.");
          onDone();
        },
      },
    );
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Fournisseur</Label>
        <Select value={supplierId || undefined} onValueChange={setSupplierId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un fournisseur…" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-[11px]">Changer le fournisseur transfère cette référence.</p>
      </div>

      <ReferencePhraseFields
        title="Modifier la référence"
        packaging={packaging}
        onPackagingChange={onPackagingChange}
        contenanceStr={contenanceStr}
        setContenanceStr={setContenanceStr}
        stockUnit={stockUnit}
        onStockUnitChange={null}
        designation={designation}
        setDesignation={setDesignation}
        refArticle={refArticle}
        setRefArticle={setRefArticle}
        priceStr={priceStr}
        setPriceStr={setPriceStr}
        priceBasis={priceBasis}
        setPriceBasis={setPriceBasis}
        t={t}
      />
      <div className="flex gap-1">
        <Button type="button" size="sm" onClick={handleSave} disabled={updateMutation.isPending || !canSave}>
          OK
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          ✕
        </Button>
      </div>
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
  const [editing, setEditing] = useState(false);
  const deleteMutation = useDeleteSupplierReference(productId);
  const supplierHistory = history.filter((h) => h.supplier_reference_id === link.id);

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
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
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
      {editing && (
        <ReferenceEditForm
          link={link}
          productId={productId}
          portionUnit={portionUnit}
          onDone={() => setEditing(false)}
        />
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
