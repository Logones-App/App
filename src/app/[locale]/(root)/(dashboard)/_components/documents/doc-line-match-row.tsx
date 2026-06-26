"use client";

import { useState } from "react";

import { CheckCircle2, Info, Link2, Loader2, SkipForward, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ApplyDocLinePayload,
  type DocImportLineRow,
  type DocLineStatus,
  useApplyDocLine,
  useMatchDocLine,
  useSkipDocLine,
  useUpdateDocLineOptions,
} from "@/lib/queries/doc-import-lines-queries";

import { DocLineCreateModal } from "./doc-line-create-modal";
import { type MatchedProductSupplier, ProductSupplierCombobox } from "./product-supplier-combobox";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const WEIGHT_VOLUME_UNITS = new Set(["g", "kg", "ml", "cl", "l"]);

function parseDecimalOverride(override: string, fallback: number | null): number | null {
  const parsed = parseFloat(override.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveStatus(automationStatus: string | null): {
  status: DocLineStatus;
  cfg: { label: string; className: string };
} {
  const status = (automationStatus ?? "pending") as DocLineStatus;
  return { status, cfg: STATUS_CFG[status] };
}

function computeEffectiveConversion(
  contenanceOverride: string,
  contenanceUnitaire: number | null,
  unitsPerPackage: number | null,
): number {
  const parsed = parseFloat(contenanceOverride.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : (contenanceUnitaire ?? unitsPerPackage ?? 1);
}

function computeSuggestConversion(
  portionUnit: string | null,
  contenanceUnitaire: number | null,
  uniteContenance: string | null,
): boolean {
  return (
    (portionUnit === "piece" || portionUnit == null) &&
    contenanceUnitaire != null &&
    uniteContenance != null &&
    WEIGHT_VOLUME_UNITS.has(uniteContenance)
  );
}

type BuildPayloadArgs = {
  line: LineData;
  supplierId: string | null;
  organizationId: string;
  establishmentId: string;
  docId: string;
  effectiveQty: number;
  effectivePrice: number | null;
  effectiveConversion: number;
  doConvertUnit: boolean;
  suggestConversion: boolean;
  productPortionUnit: string | null;
};

function buildApplyPayload(args: BuildPayloadArgs): ApplyDocLinePayload | null {
  const { line, supplierId, organizationId, establishmentId, docId } = args;
  if (!line.supplier_reference_id || !line.product_id) return null;
  const ps = line.supplier_reference;
  const orderUnit = ps?.order_unit ?? line.unite ?? null;
  const portionUnit = line.product?.portion_unit ?? null;
  const shouldConvert =
    args.doConvertUnit && args.suggestConversion && line.contenance_unitaire != null && line.unite_contenance != null;
  return {
    lineId: line.id,
    supplierRefId: line.supplier_reference_id,
    productId: line.product_id,
    supplierId: ps?.supplier?.id ?? supplierId ?? "",
    organizationId,
    establishmentId,
    applyPrice: line.apply_price,
    applyStock: line.apply_stock,
    quantity: args.effectiveQty,
    unitPrice: args.effectivePrice,
    unitCost: computeUnitCost(args.effectivePrice, args.effectiveConversion),
    orderUnit,
    portionUnit,
    supplierRef: ps?.supplier_product_ref ?? line.reference ?? null,
    importId: docId,
    contenanceUnitaire: args.effectiveConversion,
    convertUnit: shouldConvert
      ? {
          fromUnit: args.productPortionUnit ?? "piece",
          toUnit: line.unite_contenance!,
          conversionFactor: args.effectiveConversion,
        }
      : undefined,
  };
}

const STATUS_CFG: Record<DocLineStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-600" },
  matched: { label: "Matché", className: "bg-blue-100 text-blue-700" },
  applied: { label: "Appliqué", className: "bg-green-100 text-green-700" },
  skipped: { label: "Ignoré", className: "bg-orange-100 text-orange-600" },
};

type LineData = DocImportLineRow & {
  supplier_reference?: {
    id: string;
    supplier_product_ref: string | null;
    supplier_product_name: string | null;
    unit_price: number | null;
    order_unit: string | null;
    conversion_factor: number | null;
    supplier: { id: string; name: string } | null;
  } | null;
  product?: { id: string; name: string; portion_unit: string | null } | null;
};

type Props = {
  line: LineData;
  docId: string;
  organizationId: string;
  establishmentId: string;
  supplierId: string | null;
};

function LineInfo({ line, statusCfg }: { line: LineData; statusCfg: { label: string; className: string } }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{line.reference ?? "—"}</span>
          <Badge variant="secondary" className={statusCfg.className}>
            {statusCfg.label}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{line.designation ?? "—"}</p>
      </div>
      <div className="text-right text-sm tabular-nums">
        <p className="font-medium">
          {line.quantite ?? "—"} {line.unite ?? ""}
        </p>
        {line.prix_unitaire != null && (
          <p className="text-muted-foreground">
            {eur.format(line.prix_unitaire)}
            {line.unite ? `/${line.unite}` : ""}
          </p>
        )}
        {line.contenance_unitaire != null && (
          <p className="text-muted-foreground text-xs">
            {line.contenance_unitaire}
            {line.unite_contenance ? ` ${line.unite_contenance}` : ""}/unité
          </p>
        )}
      </div>
    </div>
  );
}

function UnitConversionHint({
  line,
  doConvertUnit,
  onToggle,
}: {
  line: LineData;
  doConvertUnit: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">
      <Info className="h-4 w-4 shrink-0" />
      <span>
        Produit géré en pièces · contenance : {line.contenance_unitaire} {line.unite_contenance}/unité
      </span>
      <label className="ml-auto flex cursor-pointer items-center gap-1.5">
        <Checkbox checked={doConvertUnit} onCheckedChange={(v) => onToggle(!!v)} />
        <span className="text-xs font-medium">Basculer en {line.unite_contenance}</span>
      </label>
    </div>
  );
}

type ApplyOptionsMutation = { mutate: (args: { lineId: string; applyPrice: boolean; applyStock: boolean }) => void };
function ApplyOptionsSection({
  line,
  qtyOverride,
  setQtyOverride,
  priceOverride,
  setPriceOverride,
  contenanceOverride,
  setContenanceOverride,
  stockQtyPreview,
  optionsMutation,
}: {
  line: LineData;
  qtyOverride: string;
  setQtyOverride: (v: string) => void;
  priceOverride: string;
  setPriceOverride: (v: string) => void;
  contenanceOverride: string;
  setContenanceOverride: (v: string) => void;
  stockQtyPreview: number;
  optionsMutation: ApplyOptionsMutation;
}) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={line.apply_price}
            onCheckedChange={(v) =>
              optionsMutation.mutate({ lineId: line.id, applyPrice: !!v, applyStock: line.apply_stock })
            }
          />
          Mettre à jour le PU HT
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={line.apply_stock}
            onCheckedChange={(v) =>
              optionsMutation.mutate({ lineId: line.id, applyPrice: line.apply_price, applyStock: !!v })
            }
          />
          Mettre à jour le stock
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {line.apply_stock && (
          <>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Qté reçue</Label>
              <Input
                value={qtyOverride || String(line.quantite ?? "")}
                onChange={(e) => setQtyOverride(e.target.value)}
                className="h-7 w-20 text-xs tabular-nums"
                inputMode="decimal"
              />
              {line.unite && <span className="text-muted-foreground text-xs">{line.unite}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">×</span>
              <Input
                value={contenanceOverride}
                onChange={(e) => setContenanceOverride(e.target.value)}
                placeholder={String(line.contenance_unitaire ?? line.supplier_reference?.conversion_factor ?? 1)}
                className="h-7 w-16 text-xs tabular-nums"
                inputMode="decimal"
              />
              <span className="text-muted-foreground text-xs">{line.product?.portion_unit ?? "u."}/unité</span>
            </div>
            <span className="text-xs font-medium text-blue-700">
              → {stockQtyPreview} {line.product?.portion_unit ?? ""}
            </span>
          </>
        )}
        {line.apply_price && (
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">PU HT</Label>
            <Input
              value={priceOverride || String(line.prix_unitaire ?? "")}
              onChange={(e) => setPriceOverride(e.target.value)}
              className="h-7 w-24 text-xs tabular-nums"
              inputMode="decimal"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LineActions({
  isMatched,
  applyMutation,
  skipMutation,
  lineId,
  onApply,
  applyDisabled,
}: {
  isMatched: boolean;
  applyMutation: { isPending: boolean };
  skipMutation: { isPending: boolean; mutate: (args: { lineId: string }) => void };
  lineId: string;
  onApply: () => void;
  applyDisabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      {isMatched && (
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={applyMutation.isPending || applyDisabled}
          onClick={onApply}
        >
          {applyMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          Appliquer
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground h-7 gap-1 text-xs"
        disabled={skipMutation.isPending}
        onClick={() => skipMutation.mutate({ lineId })}
      >
        <SkipForward className="h-3 w-3" /> Ignorer
      </Button>
    </div>
  );
}

// Modèle unique : conversion = nb d'unités de stock par unité d'achat → coût = prix ÷ conversion.
function computeUnitCost(effectivePrice: number | null, effectiveConversion: number): number | null {
  if (effectivePrice == null) return null;
  const f = effectiveConversion > 0 ? effectiveConversion : 1;
  return Math.round((effectivePrice / f) * 10000) / 10000;
}

export function DocLineMatchRow({ line, docId, organizationId, establishmentId, supplierId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [qtyOverride, setQtyOverride] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [contenanceOverride, setContenanceOverride] = useState("");
  const [doConvertUnit, setDoConvertUnit] = useState(false);

  const matchMutation = useMatchDocLine(docId, organizationId);
  const applyMutation = useApplyDocLine(docId);
  const skipMutation = useSkipDocLine(docId);
  const optionsMutation = useUpdateDocLineOptions(docId);

  const { status, cfg: statusCfg } = resolveStatus(line.automation_status);
  const isApplied = status === "applied";
  const isSkipped = status === "skipped";
  const isMatched = status === "matched";

  const effectiveQty = parseDecimalOverride(qtyOverride, line.quantite) ?? 0;
  const effectivePrice = parseDecimalOverride(priceOverride, line.prix_unitaire);

  const productPortionUnit = line.product?.portion_unit ?? null;
  const effectiveConversion = computeEffectiveConversion(
    contenanceOverride,
    line.contenance_unitaire,
    line.supplier_reference?.conversion_factor ?? null,
  );
  const stockQtyPreview = effectiveQty * effectiveConversion;
  const suggestConversion = computeSuggestConversion(
    productPortionUnit,
    line.contenance_unitaire,
    line.unite_contenance,
  );

  const handleSelect = (ps: MatchedProductSupplier) => {
    setContenanceOverride(ps.unitsPerPackage != null ? String(ps.unitsPerPackage) : "");
    matchMutation.mutate({ lineId: line.id, supplierRefId: ps.id, productId: ps.productId });
  };

  const handleApply = () => {
    const payload = buildApplyPayload({
      line,
      supplierId,
      organizationId,
      establishmentId,
      docId,
      effectiveQty,
      effectivePrice,
      effectiveConversion,
      doConvertUnit,
      suggestConversion,
      productPortionUnit,
    });
    if (payload) applyMutation.mutate(payload);
  };

  return (
    <>
      <div
        className={`rounded-lg border p-4 ${isApplied ? "border-green-200 bg-green-50/30" : isSkipped ? "opacity-50" : ""}`}
      >
        <LineInfo line={line} statusCfg={statusCfg} />

        {!isApplied && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
            <ProductSupplierCombobox
              organizationId={organizationId}
              value={line.supplier_reference_id}
              onSelect={handleSelect}
              onCreateRequest={() => setShowCreate(true)}
            />
            {line.supplier_reference_id && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-400"
                onClick={() => {
                  setContenanceOverride("");
                  matchMutation.mutate({ lineId: line.id, supplierRefId: null, productId: null });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {isMatched && suggestConversion && (
          <UnitConversionHint line={line} doConvertUnit={doConvertUnit} onToggle={setDoConvertUnit} />
        )}

        {isMatched && (
          <ApplyOptionsSection
            line={line}
            qtyOverride={qtyOverride}
            setQtyOverride={setQtyOverride}
            priceOverride={priceOverride}
            setPriceOverride={setPriceOverride}
            contenanceOverride={contenanceOverride}
            setContenanceOverride={setContenanceOverride}
            stockQtyPreview={stockQtyPreview}
            optionsMutation={optionsMutation}
          />
        )}

        {!isApplied && !isSkipped && (
          <LineActions
            isMatched={isMatched}
            applyMutation={applyMutation}
            skipMutation={skipMutation}
            lineId={line.id}
            onApply={handleApply}
            applyDisabled={!line.apply_price && !line.apply_stock}
          />
        )}

        {isApplied && (
          <p className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Appliqué
            {line.applied_at && ` · ${new Date(line.applied_at).toLocaleDateString("fr-FR")}`}
          </p>
        )}
      </div>

      {showCreate && (
        <DocLineCreateModal
          line={line}
          organizationId={organizationId}
          establishmentId={establishmentId}
          supplierId={supplierId}
          docId={docId}
          onClose={() => setShowCreate(false)}
          onCreated={(ps) => {
            handleSelect(ps);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}
