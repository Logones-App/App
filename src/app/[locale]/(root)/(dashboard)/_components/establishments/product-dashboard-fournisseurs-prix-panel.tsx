"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice, useProductPurchasePriceHistory } from "@/lib/queries/purchase-price-queries";
import {
  useDeleteProductSupplier,
  useProductSuppliers,
  useUpdateProductSupplier,
  type ProductSupplierRow,
} from "@/lib/queries/supplier-queries";
import { compatibleUnits, normalizeUnitPrice, toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

import { AddSupplierModal } from "./product-fournisseur-add-modal";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

type ProductSupplierWithName = ProductSupplierRow & {
  supplier: { id: string; name: string; is_active: boolean } | null;
};

type HistoryRow = { id: string; unit_cost: number; effective_from: string; supplier_id: string | null };

const HISTORY_PAGE = 5;

function PriceHistory({ rows, portionUnit }: { rows: HistoryRow[]; portionUnit: string | null }) {
  const [show, setShow] = useState(false);
  const [limit, setLimit] = useState(HISTORY_PAGE);
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
              <p key={h.id} className="text-muted-foreground text-xs tabular-nums">
                {eur.format(value)}
                {displayUnit ? ` / ${displayUnit}` : ""}
                {" · "}
                {format(parseISO(h.effective_from), "d MMM yyyy", { locale: fr })}
              </p>
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

function SupplierCardHeader({
  supplierName,
  isActive,
  isPreferred,
  onTogglePreferred,
}: {
  supplierName: string | null;
  isActive: boolean | null;
  isPreferred: boolean;
  onTogglePreferred: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" title={isPreferred ? "Retirer préféré" : "Marquer préféré"} onClick={onTogglePreferred}>
        <Star className={`h-4 w-4 ${isPreferred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      </button>
      <span className="font-medium">{supplierName ?? "—"}</span>
      {isActive === false && (
        <Badge variant="secondary" className="text-xs">
          Inactif
        </Badge>
      )}
      {isPreferred && (
        <Badge variant="outline" className="border-yellow-400 text-xs text-yellow-700">
          Préféré
        </Badge>
      )}
    </div>
  );
}

// ─── Carte fournisseur ─────────────────────────────────────────────────────────

function SupplierPriceCard({
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
  history: { id: string; unit_cost: number; effective_from: string; supplier_id: string | null }[];
}) {
  const t = useTranslations("units");
  const [editPrice, setEditPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(numToStr(link.unit_price));
  const [unitInput, setUnitInput] = useState(link.order_unit ?? portionUnit ?? "");
  const [qtyInput, setQtyInput] = useState(String(link.units_per_package ?? 1));
  const [refInput, setRefInput] = useState(link.supplier_product_ref ?? "");
  const [nameInput, setNameInput] = useState(link.supplier_product_name ?? "");
  const [oqInput, setOqInput] = useState(numToStr(link.order_quantity));
  const [ltdInput, setLtdInput] = useState(numToStr(link.lead_time_days));

  const updateMutation = useUpdateProductSupplier(productId);
  const deleteMutation = useDeleteProductSupplier(productId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);

  const supplierHistory = history.filter((h) => h.supplier_id === link.supplier_id);
  const unitOptions = compatibleUnits(portionUnit, PORTION_UNITS);

  const handleSavePrice = () => {
    const cost = parseFloat(priceInput.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Prix invalide.");
      return;
    }
    const unitPrice = Math.round(cost * 10000) / 10000;
    const qty = parseFloat(qtyInput.replace(",", "."));
    const qtyNum = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const normalizedCost = normalizeUnitPrice(unitPrice, unitInput || null, portionUnit);
    updateMutation.mutate(
      {
        id: link.id,
        patch: {
          unit_price: unitPrice,
          order_unit: unitInput || null,
          units_per_package: qtyNum > 1 ? qtyNum : null,
          supplier_product_ref: refInput.trim() || null,
          supplier_product_name: nameInput.trim() || null,
          order_quantity: posNum(oqInput),
          lead_time_days: posInt(ltdInput),
        },
      },
      {
        onSuccess: () => {
          addHistoryMutation.mutate({
            unit_cost: normalizedCost,
            effective_from: new Date().toISOString().slice(0, 10),
            supplier_id: link.supplier_id,
          });
          setEditPrice(false);
        },
      },
    );
  };

  return (
    <div
      className={`rounded-lg border p-4 ${link.is_preferred ? "border-yellow-300 bg-yellow-50/30 dark:border-yellow-800 dark:bg-yellow-950/20" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <SupplierCardHeader
            supplierName={link.supplier?.name ?? null}
            isActive={link.supplier?.is_active ?? null}
            isPreferred={link.is_preferred}
            onTogglePreferred={() =>
              updateMutation.mutate({ id: link.id, patch: { is_preferred: !link.is_preferred } })
            }
          />
          <SupplierPriceDisplay
            unitPrice={link.unit_price ?? null}
            orderUnit={link.order_unit ?? null}
            portionUnit={portionUnit}
            qtyPerOrder={link.units_per_package ?? null}
          />
          <SupplierRefChips
            supplierRef={link.supplier_product_ref ?? null}
            name={link.supplier_product_name ?? null}
            orderQuantity={link.order_quantity ?? null}
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
              setOqInput(numToStr(link.order_quantity));
              setLtdInput(numToStr(link.lead_time_days));
            }}
          >
            Modifier le prix
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            onClick={() => deleteMutation.mutate(link.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {editPrice && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
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
            <Select value={unitInput || "__none__"} onValueChange={(v) => setUnitInput(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Unité</SelectItem>
                {unitOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u as PortionUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">×</span>
              <Input
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                inputMode="decimal"
                placeholder="1"
                className="w-16 tabular-nums"
              />
            </div>
            <Button type="button" size="sm" onClick={handleSavePrice} disabled={updateMutation.isPending}>
              OK
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditPrice(false)}>
              ✕
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="Réf. article (ex: TG-12345)"
              className="w-44 font-mono text-xs"
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
      )}

      <PriceHistory rows={supplierHistory} portionUnit={portionUnit} />
    </div>
  );
}

export function ProductFournisseursPrixPanel({
  productId,
  organizationId,
  portionUnit,
  title = "Fournisseurs & Prix d'achat",
  description = "Le fournisseur ★ est utilisé en priorité pour les calculs de coût matière.",
}: {
  productId: string;
  organizationId: string;
  portionUnit: string | null;
  title?: string;
  description?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: links = [], isLoading } = useProductSuppliers(productId);
  const { data: history = [] } = useProductPurchasePriceHistory(productId, organizationId);

  const usedIds = new Set(links.map((l) => l.supplier_id));
  const preferred = links.find((l) => l.is_preferred) as ProductSupplierWithName | undefined;

  return (
    <div className="space-y-6">
      {preferred && (
        <Card className="border-yellow-200 bg-yellow-50/40 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              Fournisseur préféré — utilisé pour le calcul du food cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{preferred.supplier?.name}</p>
            {preferred.unit_price != null &&
              (() => {
                const { value: pv, displayUnit: pu } = toFriendlyUnitCost(
                  preferred.unit_price,
                  preferred.order_unit ?? portionUnit,
                );
                return (
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {eur.format(pv)}
                    {pu ? ` / ${pu}` : ""}
                    {preferred.units_per_package != null && preferred.units_per_package > 1
                      ? ` × ${preferred.units_per_package}`
                      : ""}
                  </p>
                );
              })()}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-muted-foreground text-sm">Chargement…</p>}

          {!isLoading && links.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun fournisseur associé.</p>
          )}

          {(links as ProductSupplierWithName[]).map((link) => (
            <SupplierPriceCard
              key={link.id}
              link={link}
              productId={productId}
              organizationId={organizationId}
              portionUnit={portionUnit}
              history={history}
            />
          ))}

          <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un prix d&apos;achat
          </Button>
        </CardContent>
      </Card>

      {showAdd && (
        <AddSupplierModal
          productId={productId}
          organizationId={organizationId}
          portionUnit={portionUnit}
          usedSupplierIds={usedIds}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
