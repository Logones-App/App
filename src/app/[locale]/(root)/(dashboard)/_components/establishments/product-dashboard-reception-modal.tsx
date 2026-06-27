"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { useCreateReception } from "@/lib/queries/reception-queries";
import {
  useActiveSuppliers,
  useCreateSupplier,
  useCreateSupplierReference,
  useSupplierReferences,
} from "@/lib/queries/supplier-queries";
import {
  compatibleUnits,
  orderQtyToStockQty,
  suggestConversionFactor,
  unitCostFromTotal,
} from "@/lib/utils/unit-conversion";

type Props = {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string | null;
  stockUnit: string | null;
  currentStock: number;
  onClose: () => void;
};

const NEW = "__new__";

type Ref = {
  id: string;
  supplier_id: string;
  supplier_product_name: string | null;
  order_unit: string | null;
  conversion_factor: number;
  unit_price: number | null;
};

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function refLabel(r: Ref): string {
  const name = r.supplier_product_name ?? "Référence";
  const unit = r.order_unit ? ` — ${r.order_unit}` : "";
  const factor = r.conversion_factor !== 1 ? ` (×${r.conversion_factor})` : "";
  return `${name}${unit}${factor}`;
}

type Derived = {
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

function deriveState(
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

async function resolveSupplierAndRef(args: {
  d: Derived;
  organizationId: string;
  newSupplierName: string;
  supplierId: string;
  orderUnit: string;
  designation: string;
  pu: number;
  createSupplier: ReturnType<typeof useCreateSupplier>;
  createRef: ReturnType<typeof useCreateSupplierReference>;
}): Promise<{ supId: string; refId: string }> {
  const { d, organizationId, newSupplierName, supplierId, orderUnit, designation, pu, createSupplier, createRef } =
    args;
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
    supplier_product_name: designation.trim() !== "" ? designation.trim() : null,
  });
  return { supId, refId };
}

function computeCanSubmit(
  d: Derived,
  args: {
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
  return !args.busy && args.qty != null && args.pu != null && supplierOk && refOk && args.effectiveStockUnit !== "";
}

// ── Bloc « nouvelle référence » ──────────────────────────────────────────────
function NewReferenceFields({
  designation,
  setDesignation,
  orderUnit,
  onOrderUnitChange,
  contenanceStr,
  setContenanceStr,
  gestionUnit,
  onGestionUnitChange,
  t,
}: {
  designation: string;
  setDesignation: (v: string) => void;
  orderUnit: string;
  onOrderUnitChange: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  gestionUnit: string;
  /** Présent uniquement à la 1ère référence : choix de l'unité de gestion. */
  onGestionUnitChange: ((v: string) => void) | null;
  t: (u: PortionUnit) => string;
}) {
  const factor = parsePositive(contenanceStr) ?? 1;
  const gestionOptions = compatibleUnits(orderUnit || null, PORTION_UNITS);
  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Nouvelle référence</p>
      <div className="space-y-2">
        <Label>Désignation / format</Label>
        <Input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="ex : Plaquette 250 g"
        />
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
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label>Unité de gestion</Label>
          {onGestionUnitChange ? (
            <Select value={gestionUnit || undefined} onValueChange={onGestionUnitChange}>
              <SelectTrigger>
                <SelectValue placeholder="— Unité" />
              </SelectTrigger>
              <SelectContent>
                {gestionOptions.map((u) => (
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

// ── Quantité + prix ──────────────────────────────────────────────────────────
function QtyPriceFields({
  qtyStr,
  setQtyStr,
  puStr,
  setPuStr,
  orderUnit,
  stockUnit,
  factor,
  currentStock,
}: {
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
  const unitCost = stockQty != null && total != null ? unitCostFromTotal(total, stockQty) : null;
  const stockAfter = stockQty != null ? Math.round((currentStock + stockQty) * 1000) / 1000 : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="space-y-2">
        <Label>Prix unitaire HT{orderUnit ? ` / ${orderUnit}` : ""} (€)</Label>
        <Input
          value={puStr}
          onChange={(e) => setPuStr(e.target.value)}
          inputMode="decimal"
          placeholder="ex: 20.00"
          className="tabular-nums"
        />
        {total != null && (
          <p className="text-muted-foreground text-xs">
            Total : <strong>{total} €</strong>
            {unitCost != null ? ` · coût FIFO : ${unitCost} €/${stockUnit}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReceptionModal(props: Props) {
  const { productId, organizationId, establishmentId, productStockId, stockUnit, currentStock, onClose } = props;
  const t = useTranslations("units");
  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const { data: refsData = [] } = useSupplierReferences(productId);
  const refs = refsData as Ref[];
  const createSupplier = useCreateSupplier(organizationId);
  const createRef = useCreateSupplierReference(productId);
  const createReception = useCreateReception(productId, organizationId, establishmentId);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [refId, setRefId] = useState("");
  const [designation, setDesignation] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [contenanceStr, setContenanceStr] = useState("1");
  const [gestionUnit, setGestionUnit] = useState(""); // 1ère référence uniquement
  const [qtyStr, setQtyStr] = useState("");
  const [puStr, setPuStr] = useState("");
  const [notes, setNotes] = useState("");

  // Unité de gestion : figée si un stock existe, sinon choisie à cette 1ère référence.
  const unitLocked = stockUnit != null;
  const effectiveStockUnit = stockUnit ?? gestionUnit;

  const d = deriveState(refs, supplierId, refId, contenanceStr, orderUnit);
  const qty = parsePositive(qtyStr);
  const pu = parsePositive(puStr);
  const busy = createSupplier.isPending || createRef.isPending || createReception.isPending;
  const canSubmit = computeCanSubmit(d, { busy, qty, pu, newSupplierName, designation, effectiveStockUnit });

  const onOrderUnitChange = (v: string) => {
    setOrderUnit(v);
    if (contenanceStr === "" || contenanceStr === "1") {
      const suggested = suggestConversionFactor(v, effectiveStockUnit || null);
      if (suggested != null) setContenanceStr(String(suggested));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || qty == null || pu == null) {
      toast.error("Complétez le fournisseur, la référence, l'unité de gestion, la quantité et le prix.");
      return;
    }
    try {
      const { supId, refId: resolvedRefId } = await resolveSupplierAndRef({
        d,
        organizationId,
        newSupplierName,
        supplierId,
        orderUnit,
        designation,
        pu,
        createSupplier,
        createRef,
      });
      createReception.mutate(
        {
          productStockId,
          stockUnit: effectiveStockUnit,
          supplierRefId: resolvedRefId,
          supplierId: supId,
          orderQty: qty,
          unitPrice: pu,
          conversionFactor: d.factor,
          notes,
        },
        { onSuccess: onClose },
      );
    } catch {
      /* erreurs gérées par les mutations */
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle réception</DialogTitle>
          <DialogDescription>
            Choisissez le fournisseur et la référence reçue, puis saisissez la quantité et le prix unitaire.
            {!unitLocked && " L'unité de gestion du stock sera figée à cette première référence."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select
              value={supplierId || undefined}
              onValueChange={(v) => {
                setSupplierId(v);
                setRefId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un fournisseur…" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW}>+ Nouveau fournisseur</SelectItem>
              </SelectContent>
            </Select>
            {d.isNewSupplier && (
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nom du fournisseur"
                autoFocus
              />
            )}
          </div>

          {d.showRefSelect && (
            <div className="space-y-2">
              <Label>Référence commandée</Label>
              <Select value={refId || undefined} onValueChange={setRefId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une référence…" />
                </SelectTrigger>
                <SelectContent>
                  {d.supplierRefs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {refLabel(r)}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW}>+ Nouvelle référence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {d.showNewRef && (
            <NewReferenceFields
              designation={designation}
              setDesignation={setDesignation}
              orderUnit={orderUnit}
              onOrderUnitChange={onOrderUnitChange}
              contenanceStr={contenanceStr}
              setContenanceStr={setContenanceStr}
              gestionUnit={effectiveStockUnit}
              onGestionUnitChange={unitLocked ? null : setGestionUnit}
              t={t}
            />
          )}

          {d.hasSupplier && (
            <QtyPriceFields
              qtyStr={qtyStr}
              setQtyStr={setQtyStr}
              puStr={puStr}
              setPuStr={setPuStr}
              orderUnit={d.effectiveOrderUnit}
              stockUnit={effectiveStockUnit || "—"}
              factor={d.factor}
              currentStock={currentStock}
            />
          )}

          <div className="space-y-2">
            <Label>Notes BL (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="N° BL, date de livraison…"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {busy ? "Enregistrement…" : "Enregistrer la réception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
