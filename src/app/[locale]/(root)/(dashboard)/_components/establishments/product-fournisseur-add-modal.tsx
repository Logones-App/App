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
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice } from "@/lib/queries/purchase-price-queries";
import { useActiveSuppliers, useCreateProductSupplier, useCreateSupplier } from "@/lib/queries/supplier-queries";
import { areUnitsCompatible, normalizeUnitPrice } from "@/lib/utils/unit-conversion";

type SupplierMode = "none" | "existing" | "new";

type Props = {
  productId: string;
  organizationId: string;
  portionUnit: string | null;
  usedSupplierIds: Set<string>;
  onClose: () => void;
};

export function AddSupplierModal({ productId, organizationId, portionUnit, usedSupplierIds, onClose }: Props) {
  const t = useTranslations("units");
  const [supplierMode, setSupplierMode] = useState<SupplierMode>("existing");
  const [selectedId, setSelectedId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [price, setPrice] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [qtyPerOrder, setQtyPerOrder] = useState("1");
  const [supplierRef, setSupplierRef] = useState("");
  const [supplierProductName, setSupplierProductName] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [notes, setNotes] = useState("");

  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const available = suppliers.filter((s) => !usedSupplierIds.has(s.id));

  const linkMutation = useCreateProductSupplier(productId);
  const createSupplierMutation = useCreateSupplier(organizationId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);
  const busy = linkMutation.isPending || createSupplierMutation.isPending || addHistoryMutation.isPending;

  const parseQty = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const submitWithSupplier = (supplierId: string | null) => {
    const cost = parseFloat(price.replace(",", "."));
    const unitPrice = Number.isFinite(cost) && cost > 0 ? Math.round(cost * 10000) / 10000 : null;
    const qtyNum = parseQty(qtyPerOrder);
    const incompatible = !areUnitsCompatible(orderUnit || null, portionUnit);
    const normalizedCost =
      unitPrice != null
        ? incompatible && qtyNum > 1
          ? Math.round((unitPrice / qtyNum) * 10000) / 10000
          : normalizeUnitPrice(unitPrice, orderUnit || null, portionUnit)
        : null;
    const effectiveCost = normalizedCost ?? unitPrice;

    const oq = parseFloat(orderQuantity.replace(",", "."));
    const ltd = parseInt(leadTimeDays, 10);

    if (supplierId) {
      linkMutation.mutate(
        {
          supplier_id: supplierId,
          organization_id: organizationId,
          unit_price: unitPrice,
          order_unit: orderUnit || null,
          units_per_package: qtyNum > 1 ? qtyNum : null,
          supplier_product_ref: supplierRef.trim() || null,
          supplier_product_name: supplierProductName.trim() || null,
          order_quantity: Number.isFinite(oq) && oq > 0 ? oq : null,
          lead_time_days: Number.isFinite(ltd) && ltd > 0 ? ltd : null,
          notes: notes.trim() || null,
        },
        {
          onSuccess: (newProductSupplierId) => {
            if (effectiveCost) {
              addHistoryMutation.mutate({
                unit_cost: effectiveCost,
                effective_from: new Date().toISOString().slice(0, 10),
                product_supplier_id: newProductSupplierId,
                supplier_id: supplierId,
                supplier_ref: supplierRef.trim() || undefined,
              });
            }
            onClose();
          },
        },
      );
    } else if (effectiveCost) {
      addHistoryMutation.mutate(
        { unit_cost: effectiveCost, effective_from: new Date().toISOString().slice(0, 10) },
        { onSuccess: onClose },
      );
    } else {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (supplierMode === "new") {
      if (!newSupplierName.trim()) {
        toast.error("Le nom du fournisseur est requis.");
        return;
      }
      createSupplierMutation.mutate(
        { name: newSupplierName.trim(), is_active: true },
        { onSuccess: (sid) => submitWithSupplier(sid) },
      );
    } else {
      submitWithSupplier(supplierMode === "existing" ? selectedId || null : null);
    }
  };

  const unitSelect = (
    <Select value={orderUnit || "__none__"} onValueChange={(v) => setOrderUnit(v === "__none__" ? "" : v)}>
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
  );

  const priceLabel = `Prix HT${orderUnit ? ` / ${orderUnit}` : portionUnit ? ` / ${portionUnit}` : ""}`;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associer un fournisseur</DialogTitle>
          <DialogDescription>
            Associez un fournisseur, renseignez son prix d&apos;achat et ses références catalogue.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Fournisseur</Label>
            <Select value={supplierMode} onValueChange={(v) => setSupplierMode(v as SupplierMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sans fournisseur</SelectItem>
                <SelectItem value="existing">Fournisseur existant</SelectItem>
                <SelectItem value="new">Créer un nouveau fournisseur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {supplierMode === "existing" && (
            <div className="space-y-2 sm:col-span-2">
              <Select value={selectedId || undefined} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un fournisseur…" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <div className="text-muted-foreground p-2 text-sm">Tous les fournisseurs sont déjà associés.</div>
                  ) : (
                    available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {supplierMode === "new" && (
            <div className="space-y-2 sm:col-span-2">
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nom du fournisseur"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{priceLabel}</Label>
            <div className="relative">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="pr-6 tabular-nums"
              />
              <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unité de commande</Label>
            {unitSelect}
          </div>

          {supplierMode !== "none" && (
            <>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Références & conditions
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  Contenance
                  {portionUnit ? (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      ({t(portionUnit as import("@/lib/constants/product-attributes").PortionUnit)} par unité
                      d&apos;achat)
                    </span>
                  ) : null}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {portionUnit
                    ? `Ex : 250 si une pièce contient 250 ${t(portionUnit as import("@/lib/constants/product-attributes").PortionUnit)}`
                    : "Quantité de stock reçue par unité d'achat"}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={qtyPerOrder}
                    onChange={(e) => setQtyPerOrder(e.target.value)}
                    inputMode="decimal"
                    placeholder="1"
                    className="tabular-nums"
                  />
                  {portionUnit && (
                    <span className="text-muted-foreground shrink-0 text-sm">
                      {t(portionUnit as import("@/lib/constants/product-attributes").PortionUnit)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qté min commande</Label>
                <p className="text-muted-foreground text-xs">Minimum imposé par le fournisseur</p>
                <Input
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label>Réf. article</Label>
                <Input value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} placeholder="TG-12345" />
              </div>
              <div className="space-y-2">
                <Label>Désignation fournisseur</Label>
                <Input
                  value={supplierProductName}
                  onChange={(e) => setSupplierProductName(e.target.value)}
                  placeholder="Gruyère râpé 1kg AOP"
                />
              </div>
              <div className="space-y-2">
                <Label>Délai livraison (j)</Label>
                <Input
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  inputMode="numeric"
                  placeholder="—"
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions particulières, remarques…"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={busy} onClick={handleSubmit}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
