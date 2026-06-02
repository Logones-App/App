"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { areUnitsCompatible, normalizeUnitPrice, toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

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

function computeNormalizedCost(
  unitPrice: number,
  orderUnit: string | null,
  portionUnit: string | null,
  qtyNum: number,
): number {
  if (!areUnitsCompatible(orderUnit, portionUnit) && qtyNum > 1) {
    return Math.round((unitPrice / qtyNum) * 10000) / 10000;
  }
  return normalizeUnitPrice(unitPrice, orderUnit, portionUnit);
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
    const normalizedCost = computeNormalizedCost(unitPrice, unitInput || null, portionUnit, qtyNum);
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
          toast.success("Prix mis à jour.");
          addHistoryMutation.mutate(
            {
              unit_cost: normalizedCost,
              effective_from: new Date().toISOString().slice(0, 10),
              product_supplier_id: link.id,
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
              <Select value={unitInput || "__none__"} onValueChange={(v) => setUnitInput(v === "__none__" ? "" : v)}>
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
                <span className="text-muted-foreground text-sm">×</span>
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
            <strong>Comment remplir ces champs ?</strong>
            <ul className="mt-1 list-none space-y-1">
              <li>
                <strong>pièce × contenance</strong> — le fournisseur vend à l&apos;unité (barquette, bouteille, sachet…)
                et votre stock est en g/kg/ml. Indiquez combien de grammes contient 1 pièce dans le champ ×.
                <br />
                <span className="font-medium">Ex : barquette de magret à 8,20 € contenant 250 g</span>
                {" → "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">8,20</code> /{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">pièce</code> ×{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">250</code> g → coût = 8,20 ÷ 250 ={" "}
                <strong>0,033 €/g</strong>
              </li>
              <li>
                <strong>kg / g / l…</strong> — le fournisseur facture <em>directement</em> au poids ou au volume (vente
                en vrac, au litre…). Le prix indiqué est déjà un prix par kg/g/l, pas par barquette.
                <br />
                <span className="font-medium">Ex : viande en vrac à 28 €/kg livrée en colis de 5 kg</span>
                {" → "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">28</code> /{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">kg</code> ×{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">5</code> → stock reçu = 5 kg, coût = 28 €/kg
                <br />
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  ⚠ Ne pas confondre avec &ldquo;pièce × 250 g&rdquo; : si le prix est par barquette, choisir
                  &ldquo;pièce&rdquo;.
                </span>
              </li>
              <li>
                <strong>— Unité</strong> — cas rare : prix d&apos;un colis livré et stocké en entier, sans sous-unité.
                Le stock reçu est toujours &ldquo;1&rdquo; par livraison.
                <br />
                <span className="font-medium">
                  Ex : assortiment de condiments à 12 € la boîte, stockée telle quelle
                </span>
                {" → "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">12</code> /{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">— Unité</code> ×{" "}
                <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">1</code>
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

  return (
    <div className="space-y-6">
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
