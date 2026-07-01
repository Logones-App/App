"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import {
  compatibleUnits,
  orderQtyToStockQty,
  toFriendlyUnitCost,
  unitCostFromTotal,
} from "@/lib/utils/unit-conversion";

import {
  A_LA_PIECE,
  BASIS_PACK,
  computeReferenceUnits,
  PACKAGINGS,
  parsePositive,
  type ReferenceUnits,
  VRAC,
} from "./product-dashboard-reception-modal-parts";

const fmtEur = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  if (Number.isInteger(r)) return String(r);
  return r < 1 ? String(r) : r.toFixed(2);
};

/** Options du dropdown « base de prix » selon le conditionnement + l'unité de stock. */
export function priceBasisOptions(
  packaging: string,
  stockUnit: string,
  t: (u: PortionUnit) => string,
): { value: string; label: string }[] {
  const measures = compatibleUnits(stockUnit, PORTION_UNITS)
    .filter((u) => u !== "piece")
    .map((u) => ({ value: u, label: t(u as PortionUnit) }));
  if (packaging === VRAC) return measures;
  if (packaging === A_LA_PIECE) return [{ value: BASIS_PACK, label: "pièce" }];
  return [{ value: BASIS_PACK, label: (packaging || "conditionnement").toLowerCase() }, ...measures];
}

/** Deux équivalences lisibles : €/conditionnement (si pack) + €/unité usuelle. */
function referenceEquivalences(ru: ReferenceUnits, stockUnit: string, packaging: string): string {
  const out: string[] = [];
  if (packaging !== VRAC) {
    const label = packaging === A_LA_PIECE ? "pièce" : (packaging || "cond.").toLowerCase();
    out.push(`${fmtEur(ru.unitPrice)} €/${label}`);
  }
  const f = toFriendlyUnitCost(ru.unitCost, stockUnit);
  if (f.displayUnit) out.push(`${fmtEur(f.value)} €/${f.displayUnit}`);
  return out.join(" · ");
}

/** Aperçu des équivalences depuis les champs bruts (chaîne vide si non calculable). */
function previewEquivalences(
  packaging: string,
  contenanceStr: string,
  stockUnit: string,
  priceStr: string,
  priceBasis: string,
): string {
  const price = parsePositive(priceStr);
  if (stockUnit === "" || price == null || priceBasis === "") return "";
  const contenance = parsePositive(contenanceStr);
  const needsContenance = packaging !== VRAC && packaging !== A_LA_PIECE;
  if (needsContenance && contenance == null) return "";
  const ru = computeReferenceUnits({
    packaging,
    contenance: contenance ?? 1,
    stockUnit,
    priceValue: price,
    priceBasis,
  });
  return referenceEquivalences(ru, stockUnit, packaging);
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

/** Formulaire « phrase » de création de référence : [conditionnement] de [contenance] [unité] + prix/base. */
export function ReferencePhraseFields({
  packaging,
  onPackagingChange,
  contenanceStr,
  setContenanceStr,
  stockUnit,
  onStockUnitChange,
  refArticle,
  setRefArticle,
  priceStr,
  setPriceStr,
  priceBasis,
  setPriceBasis,
  t,
}: {
  packaging: string;
  onPackagingChange: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  stockUnit: string;
  onStockUnitChange: ((v: string) => void) | null;
  refArticle: string;
  setRefArticle: (v: string) => void;
  priceStr: string;
  setPriceStr: (v: string) => void;
  priceBasis: string;
  setPriceBasis: (v: string) => void;
  t: (u: PortionUnit) => string;
}) {
  const isVrac = packaging === VRAC;
  const isPiece = packaging === A_LA_PIECE;
  const showContenance = !isVrac && !isPiece;
  const unitOptions = isVrac ? PORTION_UNITS.filter((u) => u !== "piece") : PORTION_UNITS;
  const basisOptions = priceBasisOptions(packaging, stockUnit, t);
  const equiv = previewEquivalences(packaging, contenanceStr, stockUnit, priceStr, priceBasis);

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Nouvelle référence</p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem] flex-1 space-y-1">
          <Label className="text-xs">Conditionnement</Label>
          <Select value={packaging || undefined} onValueChange={onPackagingChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VRAC}>Vrac (au poids/volume)</SelectItem>
              <SelectItem value={A_LA_PIECE}>À la pièce</SelectItem>
              {PACKAGINGS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showContenance && (
          <>
            <span className="text-muted-foreground pb-2 text-sm">de</span>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Contenance</Label>
              <Input
                value={contenanceStr}
                onChange={(e) => setContenanceStr(e.target.value)}
                inputMode="decimal"
                placeholder="1"
                className="tabular-nums"
              />
            </div>
          </>
        )}
        {isVrac && <span className="text-muted-foreground pb-2 text-sm">au</span>}

        <div className="w-24 space-y-1">
          <Label className="text-xs">Unité</Label>
          {isPiece ? (
            <Input value="pièce" disabled readOnly className="bg-muted/50" />
          ) : onStockUnitChange ? (
            <Select value={stockUnit || undefined} onValueChange={onStockUnitChange}>
              <SelectTrigger>
                <SelectValue placeholder="— Unité" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={stockUnit ? t(stockUnit as PortionUnit) : ""} disabled readOnly className="bg-muted/50" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28 space-y-1">
          <Label className="text-xs">Prix HT</Label>
          <Input
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            inputMode="decimal"
            placeholder="ex: 6.00"
            className="tabular-nums"
          />
        </div>
        <span className="text-muted-foreground pb-2 text-sm">€ /</span>
        <div className="w-28 space-y-1">
          <Label className="text-xs">par</Label>
          <Select value={priceBasis || undefined} onValueChange={setPriceBasis}>
            <SelectTrigger>
              <SelectValue placeholder="base" />
            </SelectTrigger>
            <SelectContent>
              {basisOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">Réf. article</Label>
          <Input value={refArticle} onChange={(e) => setRefArticle(e.target.value)} placeholder="TG-12345" />
        </div>
      </div>

      {equiv !== "" && <p className="text-muted-foreground text-xs">→ {equiv}</p>}
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
  showPrice = true,
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
  showPrice?: boolean;
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
      {showPrice && (
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
      )}
    </div>
  );
}

/**
 * Section « nouvelle référence » (phrase), utilisée par les modes prix ET réception.
 * Regroupée ici pour garder le modal simple (la logique picker d'unité reste isolée).
 */
export function NewRefSection(props: {
  showGestionPicker: boolean;
  setGestionUnit: (v: string) => void;
  packaging: string;
  onPackagingChange: (v: string) => void;
  priceBasis: string;
  setPriceBasis: (v: string) => void;
  puStr: string;
  setPuStr: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  refArticle: string;
  setRefArticle: (v: string) => void;
  stockUnit: string;
  t: (u: PortionUnit) => string;
}) {
  return (
    <ReferencePhraseFields
      packaging={props.packaging}
      onPackagingChange={props.onPackagingChange}
      contenanceStr={props.contenanceStr}
      setContenanceStr={props.setContenanceStr}
      stockUnit={props.stockUnit}
      onStockUnitChange={props.showGestionPicker ? props.setGestionUnit : null}
      refArticle={props.refArticle}
      setRefArticle={props.setRefArticle}
      priceStr={props.puStr}
      setPriceStr={props.setPuStr}
      priceBasis={props.priceBasis}
      setPriceBasis={props.setPriceBasis}
      t={props.t}
    />
  );
}
