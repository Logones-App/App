"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import type { useCreateSupplier, useCreateSupplierReference } from "@/lib/queries/supplier-queries";
import {
  compatibleUnits,
  convertUnit,
  orderQtyToStockQty,
  unitCategory,
  unitCostFromTotal,
} from "@/lib/utils/unit-conversion";

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

/**
 * Déduit l'unité de gestion du stock impliquée par une référence existante,
 * à partir de son couple (order_unit, conversion_factor).
 * Retourne `null` si indéductible (unité de commande absente ou facteur non dimensionnel).
 */
export function stockUnitFromRef(ref: Ref | null): string | null {
  if (!ref || !ref.order_unit) return null;
  const factor = ref.conversion_factor;
  for (const u of compatibleUnits(ref.order_unit, PORTION_UNITS)) {
    const f = convertUnit(1, ref.order_unit, u);
    if (f != null && Math.abs(f - factor) < 1e-9) return u;
  }
  return null;
}

/** Unité de stock effective : prop figée > choix utilisateur > déduction de la référence. */
export function resolveStockUnit(stockUnit: string | null, gestionUnit: string, derived: string | null): string {
  if (stockUnit != null) return stockUnit;
  if (gestionUnit !== "") return gestionUnit;
  return derived ?? "";
}

/**
 * Sélecteur d'unité de gestion du stock, affiché pour une référence existante quand le produit
 * n'a pas encore d'unité figée. Pré-rempli avec l'unité déduite de la référence si possible,
 * mais toujours modifiable — pour ne jamais bloquer l'ajout d'un prix (sans entrée de stock).
 */
export function GestionUnitField({
  show,
  hasRef,
  orderUnit,
  value,
  onChange,
  t,
}: {
  show: boolean;
  hasRef: boolean;
  orderUnit: string | null;
  value: string;
  onChange: (v: string) => void;
  t: (u: PortionUnit) => string;
}) {
  if (!show || !hasRef) return null;
  const options = compatibleUnits(orderUnit, PORTION_UNITS);
  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label>Unité de gestion du stock</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir l'unité de suivi du stock…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((u) => (
            <SelectItem key={u} value={u}>
              {t(u as PortionUnit)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-[11px]">
        Figée à cette première référence — aucune entrée de stock n&apos;est nécessaire.
      </p>
    </div>
  );
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
  const hasExistingRefs = supplierRefs.length > 0;
  // « Nouvelle référence » : nouveau fournisseur, choix explicite (+ Nouvelle), ou fournisseur sans aucune référence.
  // On NE crée PAS de nouvelle référence tant que rien n'est choisi si des références existent déjà.
  const isNewRef = isNewSupplier || refId === NEW || (hasSupplier && !hasExistingRefs);
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
    showRefSelect: hasSupplier && !isNewSupplier && hasExistingRefs,
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
  const refOk = d.isNewRef ? args.designation.trim() !== "" : d.selectedRef != null;
  const qtyOk = args.mode === "price" || args.qty != null;
  const unitOk = !args.manageStock || args.effectiveStockUnit !== "";
  return !args.busy && args.pu != null && qtyOk && supplierOk && refOk && unitOk;
}

/**
 * Unités de commande cohérentes avec une unité de gestion (stock) déjà figée :
 * même catégorie (masse↔masse, volume↔volume) + « piece » (achat au colis/à la pièce, facteur manuel).
 * Stock à la pièce → commande à la pièce uniquement. Unité inconnue → toutes autorisées.
 */
export function orderUnitsForStock(stockUnit: string): readonly PortionUnit[] {
  const cat = unitCategory(stockUnit);
  if (cat == null) return PORTION_UNITS;
  if (cat === "unit") return ["piece"];
  return PORTION_UNITS.filter((u) => unitCategory(u) === cat || u === "piece");
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
      <div className={`grid gap-3 ${orderUnit !== "" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label>Unité de commande</Label>
          <Select value={orderUnit || "__none__"} onValueChange={(v) => onOrderUnitChange(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="— Unité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Aucune</SelectItem>
              {(onGestionUnitChange ? PORTION_UNITS : orderUnitsForStock(gestionUnit)).map((u) => (
                <SelectItem key={u} value={u}>
                  {t(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {orderUnit !== "" && (
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
        )}
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
      {orderUnit !== "" && (
        <p className="text-muted-foreground text-xs">
          1 {orderUnit} ={" "}
          <strong>
            {factor} {gestionUnit || "unité de gestion"}
          </strong>
        </p>
      )}
    </div>
  );
}

function computeAmounts(qtyStr: string, puStr: string, factor: number, currentStock: number) {
  const qty = parsePositive(qtyStr);
  const pu = parsePositive(puStr);
  const stockQty = qty != null ? orderQtyToStockQty(qty, factor) : null;
  const total = qty != null && pu != null ? Math.round(qty * pu * 100) / 100 : null;
  const fifoCost = stockQty != null && total != null ? unitCostFromTotal(total, stockQty) : null;
  const stockAfter = stockQty != null ? Math.round((currentStock + stockQty) * 1000) / 1000 : null;
  const normalizedCost = pu != null ? Math.round((pu / (factor > 0 ? factor : 1)) * 100000) / 100000 : null;
  return { stockQty, total, fifoCost, stockAfter, normalizedCost };
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
  const { stockQty, total, fifoCost, stockAfter, normalizedCost } = computeAmounts(qtyStr, puStr, factor, currentStock);
  // Aperçus masqués tant que l'unité de gestion n'est pas connue (sinon « €/— » trompeur).
  const hasUnit = stockUnit !== "" && stockUnit !== "—";

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
          {hasUnit && stockQty != null && (
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
            {hasUnit && fifoCost != null ? ` · coût FIFO : ${fifoCost} €/${stockUnit}` : ""}
          </p>
        )}
        {!showQty && hasUnit && normalizedCost != null && (
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
