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
import { Textarea } from "@/components/ui/textarea";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { useAddPurchasePrice } from "@/lib/queries/purchase-price-queries";
import { ensureSelfStock } from "@/lib/queries/reception-queries";
import { useActiveSuppliers, useCreateSupplierReference, useCreateSupplier } from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";
import { compatibleUnits, suggestConversionFactor, toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

type SupplierMode = "none" | "existing" | "new";

type Props = {
  productId: string;
  organizationId: string;
  /** Unité de gestion (fixe) du produit si un stock existe — sinon null. */
  portionUnit: string | null;
  onClose: () => void;
  /** Fournis pour un ingrédient : permet de créer la fiche stock + figer l'unité à la 1ère référence. */
  establishmentId?: string;
  manageStock?: boolean;
};

function PricingFields({
  orderUnit,
  onOrderUnitChange,
  contenanceStr,
  setContenanceStr,
  needGestionPicker,
  gestionUnit,
  setGestionUnit,
  effectiveGestionUnit,
  factor,
  price,
  setPrice,
  friendly,
  t,
}: {
  orderUnit: string;
  onOrderUnitChange: (v: string) => void;
  contenanceStr: string;
  setContenanceStr: (v: string) => void;
  needGestionPicker: boolean;
  gestionUnit: string;
  setGestionUnit: (v: string) => void;
  effectiveGestionUnit: string;
  factor: number;
  price: string;
  setPrice: (v: string) => void;
  friendly: { value: number; displayUnit: string } | null;
  t: (u: PortionUnit) => string;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Unité de commande</Label>
        <Select value={orderUnit || "__none__"} onValueChange={onOrderUnitChange}>
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
      </div>
      <div className="space-y-2">
        <Label>Contenance</Label>
        <Input
          value={contenanceStr}
          onChange={(e) => setContenanceStr(e.target.value)}
          inputMode="decimal"
          placeholder="1"
          className="tabular-nums"
        />
        {needGestionPicker && (
          <Select value={gestionUnit || undefined} onValueChange={setGestionUnit}>
            <SelectTrigger>
              <SelectValue placeholder="Unité de gestion…" />
            </SelectTrigger>
            <SelectContent>
              {compatibleUnits(orderUnit || null, PORTION_UNITS).map((u) => (
                <SelectItem key={u} value={u}>
                  {t(u as PortionUnit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-muted-foreground text-xs">
          1 {orderUnit !== "" ? orderUnit : "unité d'achat"} ={" "}
          <strong>
            {factor} {effectiveGestionUnit ? t(effectiveGestionUnit as PortionUnit) : "unité de gestion"}
          </strong>
        </p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Prix HT{orderUnit ? ` / ${orderUnit}` : ""}</Label>
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
        {friendly != null && (
          <p className="text-muted-foreground text-xs">
            → coût normalisé :{" "}
            <strong>
              {friendly.value} €/{friendly.displayUnit}
            </strong>
          </p>
        )}
      </div>
    </>
  );
}

// Crée la fiche stock (et fige l'unité de gestion) si on est sur la 1ère référence d'un ingrédient.
async function ensureStockIfNeeded(args: {
  needGestionPicker: boolean;
  gestionUnit: string;
  productId: string;
  organizationId: string;
  establishmentId?: string;
}): Promise<boolean> {
  if (!args.needGestionPicker) return true;
  if (args.gestionUnit === "") {
    toast.error("Choisissez l'unité de gestion du stock.");
    return false;
  }
  if (args.establishmentId) {
    await ensureSelfStock(createClient(), {
      productId: args.productId,
      establishmentId: args.establishmentId,
      organizationId: args.organizationId,
      desiredUnit: args.gestionUnit,
    });
  }
  return true;
}

export function AddSupplierModal({
  productId,
  organizationId,
  portionUnit,
  onClose,
  establishmentId,
  manageStock = false,
}: Props) {
  const t = useTranslations("units");

  const [supplierMode, setSupplierMode] = useState<SupplierMode>("existing");
  const [selectedId, setSelectedId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [contenanceStr, setContenanceStr] = useState("1");
  const [gestionUnit, setGestionUnit] = useState(""); // 1ère référence d'un ingrédient
  const [supplierRef, setSupplierRef] = useState("");
  const [supplierProductName, setSupplierProductName] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");

  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const linkMutation = useCreateSupplierReference(productId);
  const createSupplierMutation = useCreateSupplier(organizationId);
  const addHistoryMutation = useAddPurchasePrice(productId, organizationId);

  const busy = linkMutation.isPending || createSupplierMutation.isPending || addHistoryMutation.isPending;

  const parsePositive = (s: string): number | null => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // Unité de gestion : figée si un stock existe (portionUnit), sinon choisie ici (ingrédient).
  const needGestionPicker = manageStock && portionUnit == null;
  const effectiveGestionUnit = portionUnit ?? gestionUnit;

  // Contenance = nb d'unités de gestion par unité de commande (conversion_factor).
  const factor = parsePositive(contenanceStr) ?? 1;
  const unitPrice = parsePositive(price); // prix par unité de commande
  // Coût normalisé par unité de gestion (modèle unique : prix ÷ contenance).
  const unitCost = unitPrice != null ? Math.round((unitPrice / factor) * 10000) / 10000 : null;
  const friendly = unitCost != null ? toFriendlyUnitCost(unitCost, effectiveGestionUnit || null) : null;

  const onOrderUnitChange = (value: string) => {
    const next = value === "__none__" ? "" : value;
    setOrderUnit(next);
    // Pré-remplit la contenance si une conversion dimensionnelle existe (kg→g = 1000).
    if (contenanceStr === "" || contenanceStr === "1") {
      const suggested = suggestConversionFactor(next, effectiveGestionUnit || null);
      if (suggested != null) setContenanceStr(String(suggested));
    }
  };

  const buildLinkPayload = (supplierId: string) => {
    const minQty = parsePositive(orderQuantity);
    const ltd = parseInt(leadTimeDays, 10);
    return {
      supplier_id: supplierId,
      organization_id: organizationId,
      unit_price: unitPrice,
      order_unit: orderUnit !== "" ? orderUnit : null,
      conversion_factor: factor,
      supplier_product_ref: supplierRef.trim() !== "" ? supplierRef.trim() : null,
      supplier_product_name: supplierProductName.trim() !== "" ? supplierProductName.trim() : null,
      min_order_qty: minQty,
      lead_time_days: Number.isFinite(ltd) && ltd >= 0 ? ltd : null,
      notes: notes.trim() !== "" ? notes.trim() : null,
    };
  };

  const journalizeSnapshot = (supplierReferenceId: string | null, supplierId: string | null) => {
    if (unitCost == null) return;
    addHistoryMutation.mutate(
      {
        unit_cost: unitCost,
        effective_from: new Date().toISOString().slice(0, 10),
        supplier_reference_id: supplierReferenceId ?? undefined,
        supplier_id: supplierId ?? undefined,
        supplier_ref: supplierRef.trim() !== "" ? supplierRef.trim() : undefined,
      },
      { onError: () => toast.error("Prix enregistré mais historique non journalisé.") },
    );
  };

  const submitWithSupplier = (supplierId: string | null) => {
    if (supplierId) {
      linkMutation.mutate(buildLinkPayload(supplierId), {
        onSuccess: (newRefId) => {
          journalizeSnapshot(newRefId, supplierId);
          onClose();
        },
      });
    } else if (unitCost != null) {
      journalizeSnapshot(null, null);
      onClose();
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (supplierMode === "existing" && !selectedId) {
      toast.error("Sélectionnez un fournisseur.");
      return;
    }
    if (supplierMode === "new" && !newSupplierName.trim()) {
      toast.error("Le nom du fournisseur est requis.");
      return;
    }

    try {
      const stockOk = await ensureStockIfNeeded({
        needGestionPicker,
        gestionUnit,
        productId,
        organizationId,
        establishmentId,
      });
      if (!stockOk) return;

      if (supplierMode === "new") {
        const sid = await createSupplierMutation.mutateAsync({ name: newSupplierName.trim(), is_active: true });
        submitWithSupplier(sid);
      } else {
        submitWithSupplier(supplierMode === "existing" ? selectedId || null : null);
      }
    } catch {
      /* erreurs gérées par les mutations */
    }
  };

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
                  {suppliers.length === 0 ? (
                    <div className="text-muted-foreground p-2 text-sm">Aucun fournisseur disponible.</div>
                  ) : (
                    suppliers.map((s) => (
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

          <PricingFields
            orderUnit={orderUnit}
            onOrderUnitChange={onOrderUnitChange}
            contenanceStr={contenanceStr}
            setContenanceStr={setContenanceStr}
            needGestionPicker={needGestionPicker}
            gestionUnit={gestionUnit}
            setGestionUnit={setGestionUnit}
            effectiveGestionUnit={effectiveGestionUnit}
            factor={factor}
            price={price}
            setPrice={setPrice}
            friendly={friendly}
            t={t}
          />

          {supplierMode !== "none" && (
            <>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Références &amp; conditions
                </p>
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
                <Label>Qté min commande</Label>
                <Input
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className="tabular-nums"
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
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Conditions particulières, remarques…"
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
