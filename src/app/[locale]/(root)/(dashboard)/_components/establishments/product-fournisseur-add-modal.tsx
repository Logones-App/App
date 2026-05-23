"use client";

import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice } from "@/lib/queries/purchase-price-queries";
import { useActiveSuppliers, useCreateProductSupplier, useCreateSupplier } from "@/lib/queries/supplier-queries";
import { convertUnit } from "@/lib/utils/unit-conversion";

function normalizeUnitPrice(price: number, orderUnit: string | null, portionUnit: string | null): number {
  if (!orderUnit || !portionUnit || orderUnit === portionUnit) return price;
  const factor = convertUnit(1, orderUnit, portionUnit);
  return factor != null ? Math.round((price / factor) * 10000) / 10000 : price;
}

type AddMode = "select" | "create";

type Props = {
  productId: string;
  organizationId: string;
  portionUnit: string | null;
  usedSupplierIds: Set<string>;
  onClose: () => void;
};

export function AddSupplierModal({ productId, organizationId, portionUnit, usedSupplierIds, onClose }: Props) {
  const [mode, setMode] = useState<AddMode>("select");
  const [selectedId, setSelectedId] = useState("");
  const [price, setPrice] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOrderUnit, setNewOrderUnit] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const available = suppliers.filter((s) => !usedSupplierIds.has(s.id));

  const linkMutation = useCreateProductSupplier(productId);
  const createSupplierMutation = useCreateSupplier(organizationId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);
  const busy = linkMutation.isPending || createSupplierMutation.isPending;

  const linkWithPrice = (supplierId: string, priceStr: string, pref: boolean, unit: string) => {
    const cost = parseFloat(priceStr.replace(",", "."));
    const unitPrice = Number.isFinite(cost) && cost > 0 ? Math.round(cost * 10000) / 10000 : null;
    const normalizedCost = unitPrice != null ? normalizeUnitPrice(unitPrice, unit || null, portionUnit) : null;
    linkMutation.mutate(
      {
        supplier_id: supplierId,
        organization_id: organizationId,
        unit_price: unitPrice,
        order_unit: unit || null,
        is_preferred: pref,
      },
      {
        onSuccess: () => {
          if (normalizedCost ?? unitPrice) {
            addHistoryMutation.mutate({
              unit_cost: normalizedCost ?? unitPrice!,
              effective_from: new Date().toISOString().slice(0, 10),
              supplier_id: supplierId,
            });
          }
          onClose();
        },
      },
    );
  };

  const handleSelect = () => {
    if (!selectedId) {
      toast.error("Sélectionnez un fournisseur.");
      return;
    }
    linkWithPrice(selectedId, price, isPreferred, orderUnit);
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    createSupplierMutation.mutate(
      { name: newName.trim(), notes: newNotes || undefined, is_active: true },
      { onSuccess: (supplierId) => linkWithPrice(supplierId, newPrice, false, newOrderUnit) },
    );
  };

  const unitSelect = (val: string, setVal: (v: string) => void) => (
    <Select value={val || "__none__"} onValueChange={(v) => setVal(v === "__none__" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="— Unité" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Aucune</SelectItem>
        {PORTION_UNITS.map((u) => (
          <SelectItem key={u.key} value={u.key}>
            {u.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const priceLabel = (unit: string) => `Prix HT${unit ? ` / ${unit}` : portionUnit ? ` / ${portionUnit}` : ""}`;

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
          <DialogDescription>Sélectionnez un fournisseur existant ou créez-en un nouveau.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-lg border p-1">
          {(["select", "create"] as AddMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "select" ? "Fournisseur existant" : "Nouveau fournisseur"}
            </button>
          ))}
        </div>
        {mode === "select" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Fournisseur *</Label>
              <Select value={selectedId || undefined} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
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
            <div className="space-y-2">
              <Label>{priceLabel(orderUnit)}</Label>
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
              {unitSelect(orderUnit, setOrderUnit)}
            </div>
            <div className="flex items-center gap-3">
              <Switch id="add-pref" checked={isPreferred} onCheckedChange={setIsPreferred} />
              <Label htmlFor="add-pref">Fournisseur préféré</Label>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nom du fournisseur *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du fournisseur"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{priceLabel(newOrderUnit)}</Label>
              <div className="relative">
                <Input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-6 tabular-nums"
                />
                <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unité de commande</Label>
              {unitSelect(newOrderUnit, setNewOrderUnit)}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Conditions, contact…"
              />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={busy} onClick={mode === "select" ? handleSelect : handleCreate}>
            {busy ? "Enregistrement…" : mode === "select" ? "Associer" : "Créer et associer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
