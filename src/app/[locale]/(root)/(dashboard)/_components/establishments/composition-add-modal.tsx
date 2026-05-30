"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { useEstablishmentVatRates } from "@/lib/queries/establishments";
import { useActiveSuppliers, useCreateSupplier } from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";
import { areUnitsCompatible, compatibleUnits } from "@/lib/utils/unit-conversion";

type SupplierMode = "none" | "existing" | "new";

function validateCreateForm({
  newName,
  supplierMode,
  newPrice,
  newPriceQty,
  newQty,
}: {
  newName: string;
  supplierMode: SupplierMode;
  newPrice: string;
  newPriceQty: string;
  newQty: string;
}) {
  if (!newName.trim()) throw new Error("Le nom est requis.");
  const priceNum = parseFloat(newPrice.replace(",", "."));
  const priceQtyNum = parseFloat(newPriceQty.replace(",", "."));
  const qtyNum = parseFloat(newQty.replace(",", "."));
  if (supplierMode !== "none" && (!Number.isFinite(priceNum) || priceNum <= 0)) throw new Error("Prix invalide.");
  if (supplierMode !== "none" && (!Number.isFinite(priceQtyNum) || priceQtyNum <= 0))
    throw new Error("Quantité de référence invalide.");
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) throw new Error("Quantité recette invalide.");
  const unitCost = supplierMode !== "none" ? Math.round((priceNum / priceQtyNum) * 10000) / 10000 : null;
  return { priceNum, priceQtyNum, qtyNum, unitCost };
}

async function createIngredientProduct(
  supabase: ReturnType<typeof createClient>,
  {
    organizationId,
    name,
    supplierMode,
    priceQtyNum,
    priceUnit,
    vatRateId,
  }: {
    organizationId: string;
    name: string;
    supplierMode: SupplierMode;
    priceQtyNum: number;
    priceUnit: string;
    vatRateId: string | null;
  },
) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      category_id: null,
      price: 0,
      vat_rate_id: vatRateId,
      product_type: ["ingredient"],
      portion_weight: supplierMode !== "none" ? priceQtyNum : null,
      portion_unit: supplierMode !== "none" ? priceUnit : null,
      is_available: true,
      deleted: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function resolveSupplier(
  supplierMode: SupplierMode,
  newSupplierName: string,
  existingSupplierId: string,
  createSupplierMutation: { mutateAsync: (v: { name: string; is_active: boolean }) => Promise<string> },
): Promise<string | null> {
  if (supplierMode === "new" && newSupplierName.trim()) {
    return createSupplierMutation.mutateAsync({ name: newSupplierName.trim(), is_active: true });
  }
  if (supplierMode === "existing" && existingSupplierId) return existingSupplierId;
  return null;
}

type Props = {
  productId: string;
  establishmentId: string;
  organizationId: string;
  queryKey: unknown[];
  onClose: () => void;
};

export function CompositionAddModal({ productId, establishmentId, organizationId, queryKey, onClose }: Props) {
  const queryClient = useQueryClient();
  const t = useTranslations("units");
  const { data: orgSuppliers = [] } = useActiveSuppliers(organizationId);
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const defaultVatRateId = vatRates[0]?.id ?? null;

  const [newName, setNewName] = useState("");
  const [supplierMode, setSupplierMode] = useState<SupplierMode>("none");
  const [existingSupplierId, setExistingSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPriceQty, setNewPriceQty] = useState("1");
  const [newPriceUnit, setNewPriceUnit] = useState("kg");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("g");

  const handlePriceUnitChange = (u: string) => {
    setNewPriceUnit(u);
    if (!areUnitsCompatible(newUnit, u)) setNewUnit(u);
  };

  const recipeUnitOptions = supplierMode !== "none" ? compatibleUnits(newPriceUnit, PORTION_UNITS) : PORTION_UNITS;

  const createSupplierMutation = useCreateSupplier(organizationId);

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const validated = validateCreateForm({ newName, supplierMode, newPrice, newPriceQty, newQty });
      const supabase = createClient();
      const productId2 = await createIngredientProduct(supabase, {
        organizationId,
        name: newName,
        supplierMode,
        priceQtyNum: validated.priceQtyNum,
        priceUnit: newPriceUnit,
        vatRateId: defaultVatRateId,
      });
      const resolvedSupplierId = await resolveSupplier(
        supplierMode,
        newSupplierName,
        existingSupplierId,
        createSupplierMutation,
      );
      if (resolvedSupplierId && validated.unitCost) {
        const { error: psErr } = await supabase.from("product_suppliers").insert({
          product_id: productId2,
          supplier_id: resolvedSupplierId,
          organization_id: organizationId,
          unit_price: validated.unitCost,
          order_unit: newPriceUnit,
          is_preferred: true,
          deleted: false,
        });
        if (psErr) throw psErr;
        await supabase.from("product_purchase_price_history").insert({
          product_id: productId2,
          organization_id: organizationId,
          unit_cost: validated.unitCost,
          supplier_id: resolvedSupplierId,
          effective_from: new Date().toISOString().slice(0, 10),
          currency: "EUR",
        });
      }
      const { error: compErr } = await supabase.from("product_compositions").insert({
        main_product_id: productId,
        component_product_id: productId2,
        composition_kind: "recipe",
        default_quantity: validated.qtyNum,
        quantity_unit: newUnit,
        establishment_id: establishmentId,
        organization_id: organizationId,
        is_required: false,
        deleted: false,
      });
      if (compErr) throw compErr;
    },
    onSuccess: () => {
      toast.success("Ingrédient créé et ajouté.");
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la création."),
  });

  const busy = createAndAddMutation.isPending || createSupplierMutation.isPending;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvel ingrédient</DialogTitle>
          <DialogDescription>Créez un nouvel ingrédient et ajoutez-le directement à la recette.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nom de l&apos;ingrédient *</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Beurre" autoFocus />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Fournisseur <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
            </Label>
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
              <Select value={existingSupplierId || undefined} onValueChange={setExistingSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un fournisseur…" />
                </SelectTrigger>
                <SelectContent>
                  {orgSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
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
              />
            </div>
          )}

          {supplierMode !== "none" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Prix d&apos;achat HT</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="10,00"
                    className="pr-6 tabular-nums"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
                </div>
                <span className="flex items-center text-sm">pour</span>
                <Input
                  value={newPriceQty}
                  onChange={(e) => setNewPriceQty(e.target.value)}
                  inputMode="decimal"
                  className="w-16 tabular-nums"
                />
                <Select value={newPriceUnit} onValueChange={handlePriceUnitChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTION_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantité pour cette recette</Label>
            <Input value={newQty} onChange={(e) => setNewQty(e.target.value)} inputMode="decimal" placeholder="50" />
          </div>
          <div className="space-y-2">
            <Label>Unité</Label>
            <Select value={newUnit} onValueChange={setNewUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipeUnitOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u as PortionUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={busy || !newName.trim()} onClick={() => createAndAddMutation.mutate()}>
            {busy ? "Création…" : "Créer et ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
