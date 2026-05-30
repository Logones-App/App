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
import { Switch } from "@/components/ui/switch";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice } from "@/lib/queries/purchase-price-queries";
import { useActiveSuppliers, useCreateProductSupplier, useCreateSupplier } from "@/lib/queries/supplier-queries";
import { normalizeUnitPrice } from "@/lib/utils/unit-conversion";

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
  const [isPreferred, setIsPreferred] = useState(false);

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
    const normalizedCost = unitPrice != null ? normalizeUnitPrice(unitPrice, orderUnit || null, portionUnit) : null;
    const effectiveCost = normalizedCost ?? unitPrice;

    if (supplierId) {
      linkMutation.mutate(
        {
          supplier_id: supplierId,
          organization_id: organizationId,
          unit_price: unitPrice,
          order_unit: orderUnit || null,
          qty_per_order: qtyNum > 1 ? qtyNum : null,
          is_preferred: isPreferred,
        },
        {
          onSuccess: () => {
            if (effectiveCost) {
              addHistoryMutation.mutate({
                unit_cost: effectiveCost,
                effective_from: new Date().toISOString().slice(0, 10),
                supplier_id: supplierId,
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
          <DialogTitle>Ajouter un prix</DialogTitle>
          <DialogDescription>
            Enregistrez un prix d&apos;achat et associez-le optionnellement à un fournisseur.
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

          <div className="space-y-2">
            <Label>Qté par colis</Label>
            <Input
              value={qtyPerOrder}
              onChange={(e) => setQtyPerOrder(e.target.value)}
              inputMode="decimal"
              placeholder="1"
              className="tabular-nums"
            />
          </div>

          {supplierMode !== "none" && (
            <div className="flex items-center gap-3">
              <Switch id="add-pref" checked={isPreferred} onCheckedChange={setIsPreferred} />
              <Label htmlFor="add-pref">Fournisseur préféré</Label>
            </div>
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
