"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AllergenPicker } from "@/components/ui/product-attribute-pickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AllergenKey, PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import {
  compatibleUnits,
  orderQtyToStockQty,
  suggestConversionFactor,
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
import { OriginPicker } from "./product-origin-picker";

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

/** Aperçu des équivalences depuis les champs bruts + drapeau d'incompatibilité d'unités. */
function previewEquivalences(
  packaging: string,
  contenanceStr: string,
  contenanceUnit: string,
  stockUnit: string,
  priceStr: string,
  priceBasis: string,
): { text: string; incompatible: boolean } {
  const price = parsePositive(priceStr);
  if (stockUnit === "" || price == null || priceBasis === "") return { text: "", incompatible: false };
  const contenance = parsePositive(contenanceStr);
  const needsContenance = packaging !== VRAC && packaging !== A_LA_PIECE;
  if (needsContenance && contenance == null) return { text: "", incompatible: false };
  const ru = computeReferenceUnits({
    packaging,
    contenance: contenance ?? 1,
    contenanceUnit,
    stockUnit,
    priceValue: price,
    priceBasis,
  });
  if (!ru.conversionOk) return { text: "", incompatible: true };
  return { text: referenceEquivalences(ru, stockUnit, packaging), incompatible: false };
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

/** Formulaire « phrase » de création/édition de référence : [conditionnement] de [contenance] [unité] + prix/base. */
export function ReferencePhraseFields({
  title = "Nouvelle référence",
  packaging,
  onPackagingChange,
  contenanceStr,
  setContenanceStr,
  contenanceUnit,
  setContenanceUnit,
  stockUnit,
  onStockUnitChange,
  designation,
  setDesignation,
  refArticle,
  setRefArticle,
  priceStr,
  setPriceStr,
  priceBasis,
  setPriceBasis,
  allergens,
  setAllergens,
  origins,
  setOrigins,
  t,
}: {
  title?: string;
  packaging: string;
  onPackagingChange: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  contenanceUnit: string;
  setContenanceUnit: (v: string) => void;
  stockUnit: string;
  onStockUnitChange: ((v: string) => void) | null;
  designation: string;
  setDesignation: (v: string) => void;
  refArticle: string;
  setRefArticle: (v: string) => void;
  priceStr: string;
  setPriceStr: (v: string) => void;
  priceBasis: string;
  setPriceBasis: (v: string) => void;
  allergens: AllergenKey[];
  setAllergens: (v: AllergenKey[]) => void;
  origins: string[];
  setOrigins: (v: string[]) => void;
  t: (u: PortionUnit) => string;
}) {
  const isVrac = packaging === VRAC;
  const isPiece = packaging === A_LA_PIECE;
  const showContenance = !isVrac && !isPiece;
  const unitOptions = isVrac ? PORTION_UNITS.filter((u) => u !== "piece") : PORTION_UNITS;
  const basisOptions = priceBasisOptions(packaging, stockUnit, t);
  const { text: equiv, incompatible } = previewEquivalences(
    packaging,
    contenanceStr,
    contenanceUnit,
    stockUnit,
    priceStr,
    priceBasis,
  );
  // Unité de la contenance (ex. « 75 cl » géré en L) : proposée dès que l'unité de stock est connue.
  const contenanceUnitOptions = stockUnit !== "" ? compatibleUnits(stockUnit, PORTION_UNITS) : [];
  const showContenanceUnit = showContenance && contenanceUnitOptions.length > 0;

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>

      <div className="space-y-1">
        <Label className="text-xs">Désignation (nom fournisseur)</Label>
        <Input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="ex : Génépi des Alpes AOP 75 cl"
        />
      </div>

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
            {showContenanceUnit && (
              <div className="w-20 space-y-1">
                <Label className="text-xs">en</Label>
                <Select value={contenanceUnit || stockUnit} onValueChange={setContenanceUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contenanceUnitOptions.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(u as PortionUnit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
        {isVrac && <span className="text-muted-foreground pb-2 text-sm">au</span>}

        <div className="w-24 space-y-1">
          <Label className="text-xs">{isVrac ? "Unité" : "Unité de stock"}</Label>
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

      {incompatible && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ Unités incompatibles : la contenance ou le prix ne peuvent pas être convertis vers l&apos;unité de stock.
          Choisissez une unité compatible (même catégorie : poids, volume…).
        </p>
      )}
      {equiv !== "" && <p className="text-muted-foreground text-xs">→ {equiv}</p>}

      <div className="space-y-1">
        <Label className="text-xs">
          Allergènes <span className="text-muted-foreground">(actifs en rouge)</span>
        </Label>
        <AllergenPicker value={allergens} onChange={setAllergens} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          Origine <span className="text-muted-foreground">(pays de production)</span>
        </Label>
        <OriginPicker value={origins} onChange={setOrigins} />
      </div>
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
  // Facteur incohérent : les unités sont dimensionnellement liées mais le facteur de la référence
  // ≠ la conversion réelle (ex. kg→g devrait valoir 1000, la réf dit 180) → stock + coût faux.
  const suggested = suggestConversionFactor(orderUnit, stockUnit);
  const factorMismatch = suggested != null && factor > 0 && Math.abs(suggested - factor) > 1e-6;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {factorMismatch && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700 sm:col-span-2 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠ Facteur de conversion incohérent : cette référence indique « 1 {orderUnit} = {factor} {stockUnit} », or 1{" "}
          {orderUnit} = {suggested} {stockUnit}. Le stock et le coût seront faux — corrigez la référence (bouton «
          Modifier ») avant de réceptionner.
        </p>
      )}
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
  contenanceUnit: string;
  setContenanceUnit: (v: string) => void;
  designation: string;
  setDesignation: (v: string) => void;
  refArticle: string;
  setRefArticle: (v: string) => void;
  stockUnit: string;
  allergens: AllergenKey[];
  setAllergens: (v: AllergenKey[]) => void;
  origins: string[];
  setOrigins: (v: string[]) => void;
  t: (u: PortionUnit) => string;
}) {
  return (
    <ReferencePhraseFields
      packaging={props.packaging}
      onPackagingChange={props.onPackagingChange}
      contenanceStr={props.contenanceStr}
      setContenanceStr={props.setContenanceStr}
      contenanceUnit={props.contenanceUnit}
      setContenanceUnit={props.setContenanceUnit}
      stockUnit={props.stockUnit}
      onStockUnitChange={props.showGestionPicker ? props.setGestionUnit : null}
      designation={props.designation}
      setDesignation={props.setDesignation}
      refArticle={props.refArticle}
      setRefArticle={props.setRefArticle}
      priceStr={props.puStr}
      setPriceStr={props.setPuStr}
      priceBasis={props.priceBasis}
      setPriceBasis={props.setPriceBasis}
      allergens={props.allergens}
      setAllergens={props.setAllergens}
      origins={props.origins}
      setOrigins={props.setOrigins}
      t={props.t}
    />
  );
}
