"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAddPurchasePrice, useProductPurchasePriceHistory } from "@/lib/queries/purchase-price-queries";
import {
  useDeleteProductSupplier,
  useProductSuppliers,
  useUpdateProductSupplier,
  type ProductSupplierRow,
} from "@/lib/queries/supplier-queries";
import { convertUnit } from "@/lib/utils/unit-conversion";

import { AddSupplierModal } from "./product-fournisseur-add-modal";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Convertit un prix par orderUnit en prix par portionUnit pour les calculs food cost. */
function normalizeUnitPrice(price: number, orderUnit: string | null, portionUnit: string | null): number {
  if (!orderUnit || !portionUnit || orderUnit === portionUnit) return price;
  const factor = convertUnit(1, orderUnit, portionUnit);
  return factor != null ? Math.round((price / factor) * 10000) / 10000 : price;
}

type ProductSupplierWithName = ProductSupplierRow & {
  supplier: { id: string; name: string; is_active: boolean } | null;
};

type HistoryRow = { id: string; unit_cost: number; effective_from: string; supplier_id: string | null };

function PriceHistory({ rows, portionUnit }: { rows: HistoryRow[]; portionUnit: string | null }) {
  const [show, setShow] = useState(false);
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
          {rows.slice(0, 5).map((h) => (
            <p key={h.id} className="text-muted-foreground text-xs tabular-nums">
              {eur.format(h.unit_cost)}
              {portionUnit ? ` / ${portionUnit}` : ""}
              {" · "}
              {format(parseISO(h.effective_from), "d MMM yyyy", { locale: fr })}
            </p>
          ))}
        </div>
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
  const [editPrice, setEditPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(link.unit_price != null ? String(link.unit_price) : "");

  const updateMutation = useUpdateProductSupplier(productId);
  const deleteMutation = useDeleteProductSupplier(productId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);

  const supplierHistory = history.filter((h) => h.supplier_id === link.supplier_id);

  const handleSavePrice = () => {
    const cost = parseFloat(priceInput.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Prix invalide.");
      return;
    }
    const unitPrice = Math.round(cost * 10000) / 10000;
    const normalizedCost = normalizeUnitPrice(unitPrice, link.order_unit ?? null, portionUnit);
    updateMutation.mutate(
      { id: link.id, patch: { unit_price: unitPrice } },
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={link.is_preferred ? "Retirer préféré" : "Marquer préféré"}
              onClick={() => updateMutation.mutate({ id: link.id, patch: { is_preferred: !link.is_preferred } })}
            >
              <Star
                className={`h-4 w-4 ${link.is_preferred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
            </button>
            <span className="font-medium">{link.supplier?.name ?? "—"}</span>
            {link.supplier && !link.supplier.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactif
              </Badge>
            )}
            {link.is_preferred && (
              <Badge variant="outline" className="border-yellow-400 text-xs text-yellow-700">
                Préféré
              </Badge>
            )}
          </div>
          {link.unit_price != null ? (
            <p className="text-muted-foreground text-sm tabular-nums">
              {eur.format(link.unit_price)}
              {(link.order_unit ?? portionUnit) ? ` / ${link.order_unit ?? portionUnit}` : ""}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs italic">Prix non renseigné</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditPrice(true);
              setPriceInput(link.unit_price != null ? String(link.unit_price) : "");
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
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="pr-12 tabular-nums"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSavePrice();
                if (e.key === "Escape") setEditPrice(false);
              }}
            />
            <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              € {(link.order_unit ?? portionUnit) ? `/ ${link.order_unit ?? portionUnit}` : ""}
            </span>
          </div>
          <Button type="button" size="sm" onClick={handleSavePrice} disabled={updateMutation.isPending}>
            OK
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditPrice(false)}>
            ✕
          </Button>
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
            {preferred.unit_price != null && (
              <p className="text-muted-foreground text-sm tabular-nums">
                {eur.format(preferred.unit_price)}
                {(preferred.order_unit ?? portionUnit) ? ` / ${preferred.order_unit ?? portionUnit}` : ""}
              </p>
            )}
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
            Associer un fournisseur
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
