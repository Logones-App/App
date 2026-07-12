"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  orderQtyToStockQty,
  suggestConversionFactor,
  unitCategory,
  unitCostFromTotal,
} from "@/lib/utils/unit-conversion";

import { ORDER_BASIS, parsePositive, toOrderUnitPrice } from "./product-dashboard-reception-modal-parts";

function computeAmounts(
  qtyStr: string,
  puStr: string,
  factor: number,
  currentStock: number,
  priceBasis: string,
  stockUnit: string,
) {
  const qty = parsePositive(qtyStr);
  const puRaw = parsePositive(puStr);
  // Prix ramené à l'unité de commande selon la base choisie (€/plaquette ou €/kg…).
  const pu = puRaw != null ? toOrderUnitPrice(puRaw, priceBasis, factor, stockUnit) : null;
  const stockQty = qty != null ? orderQtyToStockQty(qty, factor) : null;
  const total = qty != null && pu != null ? Math.round(qty * pu * 100) / 100 : null;
  const fifoCost = stockQty != null && total != null ? unitCostFromTotal(total, stockQty) : null;
  const stockAfter = stockQty != null ? Math.round((currentStock + stockQty) * 1000) / 1000 : null;
  const normalizedCost = pu != null ? Math.round((pu / (factor > 0 ? factor : 1)) * 100000) / 100000 : null;
  return { stockQty, total, fifoCost, stockAfter, normalizedCost };
}

function QtyField({
  qtyStr,
  setQtyStr,
  orderUnit,
  stockUnit,
  stockQty,
  stockAfter,
  hasUnit,
}: {
  qtyStr: string;
  setQtyStr: (v: string) => void;
  orderUnit: string | null;
  stockUnit: string;
  stockQty: number | null;
  stockAfter: number | null;
  hasUnit: boolean;
}) {
  return (
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
  );
}

function PriceField({
  puStr,
  setPuStr,
  orderUnit,
  stockUnit,
  showQty,
  showBasis,
  priceBasis,
  setPriceBasis,
  basisLabel,
  total,
  fifoCost,
  normalizedCost,
  hasUnit,
}: {
  puStr: string;
  setPuStr: (v: string) => void;
  orderUnit: string | null;
  stockUnit: string;
  showQty: boolean;
  showBasis: boolean;
  priceBasis: string;
  setPriceBasis?: (v: string) => void;
  basisLabel: string;
  total: number | null;
  fifoCost: number | null;
  normalizedCost: number | null;
  hasUnit: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Prix HT{!showBasis && orderUnit ? ` / ${orderUnit}` : ""} (€)</Label>
      <div className="flex items-center gap-2">
        <Input
          value={puStr}
          onChange={(e) => setPuStr(e.target.value)}
          inputMode="decimal"
          placeholder="ex: 20.00"
          className="flex-1 tabular-nums"
        />
        {showBasis && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <Select value={priceBasis} onValueChange={(v) => setPriceBasis?.(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORDER_BASIS}>{orderUnit ?? "unité"}</SelectItem>
                <SelectItem value={stockUnit}>{stockUnit}</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      {showBasis && (
        <p className="text-muted-foreground text-[11px]">
          Prix saisi par <strong>{basisLabel}</strong> — bascule « {orderUnit} » ⇄ « {stockUnit} » selon ta facture.
        </p>
      )}
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
  );
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
  priceBasis = ORDER_BASIS,
  setPriceBasis,
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
  priceBasis?: string;
  setPriceBasis?: (v: string) => void;
}) {
  const { stockQty, total, fifoCost, stockAfter, normalizedCost } = computeAmounts(
    qtyStr,
    puStr,
    factor,
    currentStock,
    priceBasis,
    stockUnit,
  );
  // Aperçus masqués tant que l'unité de gestion n'est pas connue (sinon « €/— » trompeur).
  const hasUnit = stockUnit !== "" && stockUnit !== "—";
  // Facteur incohérent : unités dimensionnellement liées mais facteur de la réf ≠ conversion réelle
  // (ex. kg→g devrait valoir 1000, la réf dit 180) → stock + coût faux.
  const suggested = suggestConversionFactor(orderUnit, stockUnit);
  const factorMismatch = suggested != null && factor > 0 && Math.abs(suggested - factor) > 1e-6;
  // Base de prix commutable : commande dans une unité ≠ de l'unité de stock (ex. plaquette vs kg)
  // → on autorise à saisir le prix « par kg » comme sur la facture.
  const stockIsMeasure = unitCategory(stockUnit) === "mass" || unitCategory(stockUnit) === "volume";
  const showBasis =
    showPrice && setPriceBasis != null && orderUnit != null && orderUnit !== stockUnit && stockIsMeasure && hasUnit;
  const basisLabel = priceBasis === ORDER_BASIS ? (orderUnit ?? "unité") : priceBasis;

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
        <QtyField
          qtyStr={qtyStr}
          setQtyStr={setQtyStr}
          orderUnit={orderUnit}
          stockUnit={stockUnit}
          stockQty={stockQty}
          stockAfter={stockAfter}
          hasUnit={hasUnit}
        />
      )}
      {showPrice && (
        <PriceField
          puStr={puStr}
          setPuStr={setPuStr}
          orderUnit={orderUnit}
          stockUnit={stockUnit}
          showQty={showQty}
          showBasis={showBasis}
          priceBasis={priceBasis}
          setPriceBasis={setPriceBasis}
          basisLabel={basisLabel}
          total={total}
          fifoCost={fifoCost}
          normalizedCost={normalizedCost}
          hasUnit={hasUnit}
        />
      )}
    </div>
  );
}
