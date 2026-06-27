"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import type { useCreateSupplier, useCreateSupplierReference } from "@/lib/queries/supplier-queries";
import { compatibleUnits, orderQtyToStockQty, unitCostFromTotal } from "@/lib/utils/unit-conversion";

export type Mode = "reception" | "price";

export const NEW = "__new__";

export type Ref = {
  id: string;
  supplier_id: string;
  supplier_product_name: string | null;
  supplier_product_ref: string | null;
  order_unit: string | null;
  conversion_factor: number;
  unit_price: number | null;
};

export function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function refLabel(r: Ref): string {
  const name = r.supplier_product_name ?? r.supplier_product_ref ?? "Référence";
  const unit = r.order_unit ? ` — ${r.order_unit}` : "";
  const factor = r.conversion_factor !== 1 ? ` (×${r.conversion_factor})` : "";
  return `${name}${unit}${factor}`;
}

export type Derived = {
  isNewSupplier: boolean;
  hasSupplier: boolean;
  supplierRefs: Ref[];
  isNewRef: boolean;
  selectedRef: Ref | null;
  factor: number;
  effectiveOrderUnit: string | null;
  showRefSelect: boolean;
  showNewRef: boolean;
};

export function deriveState(
  refs: Ref[],
  supplierId: string,
  refId: string,
  contenanceStr: string,
  orderUnit: string,
): Derived {
  const isNewSupplier = supplierId === NEW;
  const hasSupplier = supplierId !== "";
  const supplierRefs = hasSupplier && !isNewSupplier ? refs.filter((r) => r.supplier_id === supplierId) : [];
  const isNewRef = isNewSupplier || refId === NEW || refId === "";
  const selectedRef = isNewRef ? null : (supplierRefs.find((r) => r.id === refId) ?? null);
  const factor = selectedRef ? selectedRef.conversion_factor : (parsePositive(contenanceStr) ?? 1);
  return {
    isNewSupplier,
    hasSupplier,
    supplierRefs,
    isNewRef,
    selectedRef,
    factor,
    effectiveOrderUnit: selectedRef ? selectedRef.order_unit : orderUnit || null,
    showRefSelect: hasSupplier && !isNewSupplier,
    showNewRef: hasSupplier && isNewRef,
  };
}

export async function resolveSupplierAndRef(args: {
  d: Derived;
  organizationId: string;
  newSupplierName: string;
  supplierId: string;
  orderUnit: string;
  designation: string;
  refArticle: string;
  pu: number;
  createSupplier: ReturnType<typeof useCreateSupplier>;
  createRef: ReturnType<typeof useCreateSupplierReference>;
}): Promise<{ supId: string; refId: string }> {
  const {
    d,
    organizationId,
    newSupplierName,
    supplierId,
    orderUnit,
    designation,
    refArticle,
    pu,
    createSupplier,
    createRef,
  } = args;
  const supId = d.isNewSupplier
    ? await createSupplier.mutateAsync({ name: newSupplierName.trim(), is_active: true })
    : supplierId;
  if (d.selectedRef) return { supId, refId: d.selectedRef.id };
  const refId = await createRef.mutateAsync({
    supplier_id: supId,
    organization_id: organizationId,
    order_unit: orderUnit !== "" ? orderUnit : null,
    conversion_factor: d.factor,
    unit_price: pu,
    supplier_product_ref: refArticle.trim() !== "" ? refArticle.trim() : null,
    supplier_product_name: designation.trim() !== "" ? designation.trim() : null,
  });
  return { supId, refId };
}

export function computeCanSubmit(
  d: Derived,
  args: {
    mode: Mode;
    manageStock: boolean;
    busy: boolean;
    qty: number | null;
    pu: number | null;
    newSupplierName: string;
    designation: string;
    effectiveStockUnit: string;
  },
): boolean {
  const supplierOk = d.isNewSupplier ? args.newSupplierName.trim() !== "" : d.hasSupplier;
  const refOk = !d.isNewRef || args.designation.trim() !== "";
  const qtyOk = args.mode === "price" || args.qty != null;
  const unitOk = !args.manageStock || args.effectiveStockUnit !== "";
  return !args.busy && args.pu != null && qtyOk && supplierOk && refOk && unitOk;
}

export function NewReferenceFields({
  designation,
  setDesignation,
  refArticle,
  setRefArticle,
  orderUnit,
  onOrderUnitChange,
  contenanceStr,
  setContenanceStr,
  contenanceLocked,
  gestionUnit,
  onGestionUnitChange,
  t,
}: {
  designation: string;
  setDesignation: (v: string) => void;
  refArticle: string;
  setRefArticle: (v: string) => void;
  orderUnit: string;
  onOrderUnitChange: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  /** true quand l'unité d'achat et l'unité de gestion sont de même nature (conversion auto). */
  contenanceLocked: boolean;
  gestionUnit: string;
  onGestionUnitChange: ((v: string) => void) | null;
  t: (u: PortionUnit) => string;
}) {
  const factor = parsePositive(contenanceStr) ?? 1;
  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Nouvelle référence</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Désignation / format</Label>
          <Input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="ex : Plaquette 250 g"
          />
        </div>
        <div className="space-y-2">
          <Label>Réf. article</Label>
          <Input value={refArticle} onChange={(e) => setRefArticle(e.target.value)} placeholder="TG-12345" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Unité de commande</Label>
          <Select value={orderUnit || "__none__"} onValueChange={(v) => onOrderUnitChange(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="— Unité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Aucune</SelectItem>
              {PORTION_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {t(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Contenance</Label>
          <Input
            value={contenanceStr}
            onChange={(e) => setContenanceStr(e.target.value)}
            inputMode="decimal"
            placeholder="1"
            disabled={contenanceLocked}
            readOnly={contenanceLocked}
            className={`tabular-nums ${contenanceLocked ? "bg-muted/50" : ""}`}
          />
          {contenanceLocked && <p className="text-muted-foreground text-[11px]">Conversion automatique</p>}
        </div>
        <div className="space-y-2">
          <Label>Unité de gestion</Label>
          {onGestionUnitChange ? (
            <Select value={gestionUnit || undefined} onValueChange={onGestionUnitChange}>
              <SelectTrigger>
                <SelectValue placeholder="— Unité" />
              </SelectTrigger>
              <SelectContent>
                {compatibleUnits(orderUnit || null, PORTION_UNITS).map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u as PortionUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={gestionUnit} disabled readOnly className="bg-muted/50" />
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        1 {orderUnit !== "" ? orderUnit : "unité d'achat"} ={" "}
        <strong>
          {factor} {gestionUnit || "unité de gestion"}
        </strong>
      </p>
    </div>
  );
}

export function AmountsFields({
  showQty,
  qtyStr,
  setQtyStr,
  puStr,
  setPuStr,
  orderUnit,
  stockUnit,
  factor,
  currentStock,
}: {
  showQty: boolean;
  qtyStr: string;
  setQtyStr: (v: string) => void;
  puStr: string;
  setPuStr: (v: string) => void;
  orderUnit: string | null;
  stockUnit: string;
  factor: number;
  currentStock: number;
}) {
  const qty = parsePositive(qtyStr);
  const pu = parsePositive(puStr);
  const stockQty = qty != null ? orderQtyToStockQty(qty, factor) : null;
  const total = qty != null && pu != null ? Math.round(qty * pu * 100) / 100 : null;
  const fifoCost = stockQty != null && total != null ? unitCostFromTotal(total, stockQty) : null;
  const stockAfter = stockQty != null ? Math.round((currentStock + stockQty) * 1000) / 1000 : null;
  const normalizedCost = pu != null ? Math.round((pu / (factor > 0 ? factor : 1)) * 100000) / 100000 : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showQty && (
        <div className="space-y-2">
          <Label>Quantité reçue{orderUnit ? ` (${orderUnit})` : ""}</Label>
          <Input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="tabular-nums"
          />
          {stockQty != null && (
            <p className="text-muted-foreground text-xs">
              →{" "}
              <strong>
                {stockQty} {stockUnit}
              </strong>{" "}
              en stock{stockAfter != null ? ` · après : ${stockAfter} ${stockUnit}` : ""}
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label>Prix unitaire HT{orderUnit ? ` / ${orderUnit}` : ""} (€)</Label>
        <Input
          value={puStr}
          onChange={(e) => setPuStr(e.target.value)}
          inputMode="decimal"
          placeholder="ex: 20.00"
          className="tabular-nums"
        />
        {showQty && total != null && (
          <p className="text-muted-foreground text-xs">
            Total : <strong>{total} €</strong>
            {fifoCost != null ? ` · coût FIFO : ${fifoCost} €/${stockUnit}` : ""}
          </p>
        )}
        {!showQty && normalizedCost != null && (
          <p className="text-muted-foreground text-xs">
            → coût normalisé :{" "}
            <strong>
              {normalizedCost} €/{stockUnit}
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}
