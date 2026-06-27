"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice, useDeletePurchasePrice } from "@/lib/queries/purchase-price-queries";
import {
  useDeleteSupplierReference,
  useUpdateSupplierReference,
  type SupplierReferenceRow,
} from "@/lib/queries/supplier-queries";
import { suggestConversionFactor, toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type ProductSupplierWithName = SupplierReferenceRow & {
  supplier: { id: string; name: string; is_active: boolean } | null;
};

type HistoryRow = { id: string; unit_cost: number; effective_from: string; supplier_id: string | null };

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

function numToStr(n: number | null | undefined): string {
  return n != null ? String(n) : "";
}

function posNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function posInt(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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

// Modèle unique : conversion_factor = nb d'unités de stock dans 1 unité d'achat (celle du prix).
function computeNormalizedCost(unitPrice: number, conversionFactor: number): number {
  const f = conversionFactor > 0 ? conversionFactor : 1;
  return Math.round((unitPrice / f) * 10000) / 10000;
}

function ContenanceLabel({ portionUnit, t }: { portionUnit: string | null; t: (u: PortionUnit) => string }) {
  if (portionUnit) {
    return (
      <p className="text-muted-foreground text-xs font-medium">
        Contenance (en {t(portionUnit as PortionUnit)} par unité d&apos;achat)
      </p>
    );
  }
  return <p className="text-muted-foreground text-xs font-medium">Contenance</p>;
}

function PortionUnitSpan({ portionUnit, t }: { portionUnit: string | null; t: (u: PortionUnit) => string }) {
  if (!portionUnit) return null;
  return <span className="text-muted-foreground text-sm">{t(portionUnit as PortionUnit)}</span>;
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
  const t = useTranslations("units");
  const [editPrice, setEditPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(numToStr(link.unit_price));
  const [unitInput, setUnitInput] = useState(link.order_unit ?? portionUnit ?? "");
  const [qtyInput, setQtyInput] = useState(String(link.conversion_factor ?? 1));
  const [refInput, setRefInput] = useState(link.supplier_product_ref ?? "");
  const [nameInput, setNameInput] = useState(link.supplier_product_name ?? "");
  const [oqInput, setOqInput] = useState(numToStr(link.min_order_qty));
  const [ltdInput, setLtdInput] = useState(numToStr(link.lead_time_days));

  const updateMutation = useUpdateSupplierReference(productId);
  const deleteMutation = useDeleteSupplierReference(productId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);

  const supplierHistory = history.filter((h) => h.supplier_id === link.supplier_id);
  const unitOptions = PORTION_UNITS;

  const handleSavePrice = () => {
    const cost = parseFloat(priceInput.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Prix invalide.");
      return;
    }
    const unitPrice = Math.round(cost * 10000) / 10000;
    const qty = parseFloat(qtyInput.replace(",", "."));
    const qtyNum = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const normalizedCost = computeNormalizedCost(unitPrice, qtyNum);
    updateMutation.mutate(
      {
        id: link.id,
        patch: {
          unit_price: unitPrice,
          order_unit: unitInput !== "" ? unitInput : null,
          conversion_factor: qtyNum,
          supplier_product_ref: refInput.trim() !== "" ? refInput.trim() : null,
          supplier_product_name: nameInput.trim() !== "" ? nameInput.trim() : null,
          min_order_qty: posNum(oqInput),
          lead_time_days: posInt(ltdInput),
        },
      },
      {
        onSuccess: () => {
          toast.success("Prix mis à jour.");
          addHistoryMutation.mutate(
            {
              unit_cost: normalizedCost,
              effective_from: new Date().toISOString().slice(0, 10),
              supplier_reference_id: link.id,
              supplier_id: link.supplier_id,
              supplier_ref: link.supplier_product_ref ?? undefined,
            },
            { onError: () => toast.error("Prix enregistré mais l'historique n'a pas pu être journalisé.") },
          );
          setEditPrice(false);
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
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditPrice(true);
              setPriceInput(numToStr(link.unit_price));
              setUnitInput(link.order_unit ?? portionUnit ?? "");
              setRefInput(link.supplier_product_ref ?? "");
              setNameInput(link.supplier_product_name ?? "");
              setOqInput(numToStr(link.min_order_qty));
              setLtdInput(numToStr(link.lead_time_days));
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
              if (confirm("Supprimer ce fournisseur du produit ?")) deleteMutation.mutate(link.id);
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {editPrice && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Prix HT</p>
              <div className="relative w-28">
                <Input
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-6 tabular-nums"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePrice();
                    if (e.key === "Escape") setEditPrice(false);
                  }}
                />
                <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Unité d&apos;achat</p>
              <Select
                value={unitInput || "__none__"}
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  setUnitInput(next);
                  if (qtyInput === "" || qtyInput === "1") {
                    const suggested = suggestConversionFactor(next, portionUnit);
                    if (suggested != null) setQtyInput(String(suggested));
                  }
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— sans unité</SelectItem>
                  {unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <ContenanceLabel portionUnit={portionUnit} t={t} />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">
                  1 {unitInput !== "" ? unitInput : "unité d'achat"} =
                </span>
                <Input
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="1"
                  className="w-16 tabular-nums"
                />
                <PortionUnitSpan portionUnit={portionUnit} t={t} />
              </div>
            </div>
            <div className="flex gap-1 pb-0.5">
              <Button type="button" size="sm" onClick={handleSavePrice} disabled={updateMutation.isPending}>
                OK
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditPrice(false)}>
                ✕
              </Button>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <strong>Règle unique :</strong> la contenance (×) = combien d&apos;unités de <strong>stock</strong> il y a
            dans <strong>1 unité d&apos;achat</strong> (celle du prix). Le coût est alors{" "}
            <strong>prix ÷ contenance</strong>.
            <ul className="mt-1 list-none space-y-1">
              <li>
                Barquette à <strong>8,20 €</strong>, stock en <strong>g</strong>, 1 barquette = 250 g →{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">8,20</code> /{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">pièce</code> ×{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">250</code> → <strong>0,0328 €/g</strong>
              </li>
              <li>
                Vrac à <strong>28 €/kg</strong>, stock en <strong>kg</strong> →{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">28</code> /{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">kg</code> ×{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">1</code> → <strong>28 €/kg</strong>
              </li>
              <li>
                Vrac à <strong>28 €/kg</strong>, stock en <strong>g</strong> → contenance{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">1000</code> (pré-remplie) →{" "}
                <strong>0,028 €/g</strong>
              </li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Réf. article · Désignation · Qté min · Délai (j)</p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="TG-12345"
                className="w-36 font-mono text-xs"
              />
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Désignation fournisseur"
                className="min-w-[12rem] flex-1 text-xs"
              />
              <Input
                value={oqInput}
                onChange={(e) => setOqInput(e.target.value)}
                inputMode="decimal"
                placeholder="Qté min"
                className="w-20 text-xs tabular-nums"
              />
              <Input
                value={ltdInput}
                onChange={(e) => setLtdInput(e.target.value)}
                inputMode="numeric"
                placeholder="Délai (j)"
                className="w-20 text-xs tabular-nums"
              />
            </div>
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
