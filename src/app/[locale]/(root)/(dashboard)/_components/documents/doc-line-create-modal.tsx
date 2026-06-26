"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { type DocImportLineRow } from "@/lib/queries/doc-import-lines-queries";
import { useEstablishmentVatRates } from "@/lib/queries/establishments-related-queries";
import { useCreateSupplier } from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";

import { OrderUnitField, ProductCombobox, SupplierCombobox } from "./doc-line-create-controls";

const PORTION_UNIT_LABELS: Record<string, string> = {
  g: "Gramme (g)",
  kg: "Kilogramme (kg)",
  ml: "Millilitre (ml)",
  cl: "Centilitre (cl)",
  l: "Litre (l)",
  piece: "Pièce",
};

type CreatedProductSupplier = {
  id: string;
  productId: string | null;
  supplierId: string | null;
  ref: string | null;
  name: string | null;
  productName: string | null;
  supplierName: string | null;
  unitPrice: number | null;
  orderUnit: string | null;
  unitsPerPackage: number | null;
};

type Props = {
  line: DocImportLineRow;
  organizationId: string;
  establishmentId: string;
  supplierId: string | null;
  docId: string;
  onClose: () => void;
  onCreated: (ps: CreatedProductSupplier) => void;
};

type CreateSupplierFn = (args: { name: string; is_active: boolean }) => Promise<string>;

async function createOrFindSupplier(
  createNew: boolean,
  selectedId: string,
  selectedName: string,
  newName: string,
  doCreate: CreateSupplierFn,
): Promise<{ id: string; name: string } | null> {
  if (!createNew) {
    if (!selectedId) {
      toast.error("Choisissez un fournisseur.");
      return null;
    }
    return { id: selectedId, name: selectedName };
  }
  if (!newName.trim()) {
    toast.error("Le nom du fournisseur est requis.");
    return null;
  }
  const id = await doCreate({ name: newName.trim(), is_active: true });
  return { id, name: newName.trim() };
}

async function createOrFindProduct(
  createNew: boolean,
  selectedId: string,
  selectedName: string,
  ingredientName: string,
  portionUnit: string,
  portionWeight: string,
  vatRateId: string,
  organizationId: string,
): Promise<{ id: string; name: string } | null> {
  if (!createNew) {
    if (!selectedId) {
      toast.error("Choisissez un ingrédient.");
      return null;
    }
    return { id: selectedId, name: selectedName };
  }
  if (!ingredientName.trim()) {
    toast.error("Le nom de l'ingrédient est requis.");
    return null;
  }
  if (!portionUnit) {
    toast.error("L'unité de stockage est requise.");
    return null;
  }
  const supabase = createClient();
  const portionWeightNum = parseFloat(portionWeight.replace(",", "."));
  const { data: newProduct, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name: ingredientName.trim(),
      product_type: ["ingredient"],
      vat_rate_id: vatRateId || null,
      portion_unit: portionUnit,
      portion_weight: Number.isFinite(portionWeightNum) && portionWeightNum > 0 ? portionWeightNum : null,
      is_available: true,
      deleted: false,
    })
    .select("id, name")
    .single();
  if (error) {
    toast.error("Erreur lors de la création de l'ingrédient");
    return null;
  }
  return { id: newProduct.id, name: newProduct.name };
}

export function DocLineCreateModal({ line, organizationId, establishmentId, supplierId, onClose, onCreated }: Props) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId ?? "");
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [createNewSupplier, setCreateNewSupplier] = useState(!supplierId);

  const [createNewIngredient, setCreateNewIngredient] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [portionUnit, setPortionUnit] = useState("");
  const [portionWeight, setPortionWeight] = useState("");
  const [vatRateId, setVatRateId] = useState("");

  const [ref, setRef] = useState(line.reference ?? "");
  const [designation, setDesignation] = useState(line.designation ?? "");
  const [price, setPrice] = useState(line.prix_unitaire != null ? String(line.prix_unitaire) : "");
  const [unit, setUnit] = useState(line.unite ?? "");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const createSupplierMutation = useCreateSupplier(organizationId);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const supabase = createClient();

      const supplier = await createOrFindSupplier(
        createNewSupplier,
        selectedSupplierId,
        selectedSupplierName,
        newSupplierName,
        (args) =>
          new Promise<string>((resolve, reject) => {
            createSupplierMutation.mutate(args, { onSuccess: resolve, onError: reject });
          }),
      );
      if (!supplier) return;

      const product = await createOrFindProduct(
        createNewIngredient,
        selectedProductId,
        selectedProductName,
        ingredientName,
        portionUnit,
        portionWeight,
        vatRateId,
        organizationId,
      );
      if (!product) return;

      const unitPrice = parseFloat(price.replace(",", "."));
      const unitsPerPackageNum = parseFloat(unitsPerPackage.replace(",", "."));
      const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : null;
      const safeUnitsPerPkg = Number.isFinite(unitsPerPackageNum) && unitsPerPackageNum > 0 ? unitsPerPackageNum : null;
      const { data: newPs, error: psError } = await supabase
        .from("supplier_references")
        .insert({
          product_id: product.id,
          supplier_id: supplier.id,
          organization_id: organizationId,
          supplier_product_ref: ref.trim() || null,
          supplier_product_name: designation.trim() || null,
          unit_price: safeUnitPrice,
          order_unit: unit.trim() || null,
          conversion_factor: safeUnitsPerPkg ?? undefined,
          is_preferred: false,
          deleted: false,
        })
        .select("id")
        .single();
      if (psError) {
        toast.error("Erreur lors de la création de l'association");
        return;
      }

      onCreated({
        id: newPs.id,
        productId: product.id,
        supplierId: supplier.id,
        ref: ref.trim() || null,
        name: designation.trim() || null,
        productName: product.name,
        supplierName: supplier.name,
        unitPrice: safeUnitPrice,
        orderUnit: unit.trim() || null,
        unitsPerPackage: safeUnitsPerPkg,
      });
    } finally {
      setBusy(false);
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
          <DialogTitle>Créer une association fournisseur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fournisseur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fournisseur</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCreateNewSupplier((v) => !v)}>
                {createNewSupplier ? "Choisir un existant" : "+ Nouveau"}
              </Button>
            </div>
            {createNewSupplier ? (
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nom du fournisseur"
                autoFocus
              />
            ) : (
              <SupplierCombobox
                organizationId={organizationId}
                value={selectedSupplierId}
                onChange={(id, name) => {
                  setSelectedSupplierId(id);
                  setSelectedSupplierName(name);
                }}
              />
            )}
          </div>

          {/* Ingrédient */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingrédient</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setCreateNewIngredient((v) => !v)}
              >
                {createNewIngredient ? "Choisir un existant" : "+ Créer un ingrédient"}
              </Button>
            </div>
            {createNewIngredient ? (
              <div className="bg-muted/30 space-y-3 rounded-md border p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={ingredientName}
                    onChange={(e) => setIngredientName(e.target.value)}
                    placeholder="Beurre doux"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unité de stockage</Label>
                    <Select value={portionUnit} onValueChange={setPortionUnit}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PORTION_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {PORTION_UNIT_LABELS[u] ?? u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contenance / unité d&apos;achat</Label>
                    <Input
                      value={portionWeight}
                      onChange={(e) => setPortionWeight(e.target.value)}
                      inputMode="decimal"
                      placeholder="ex : 1"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Taux TVA</Label>
                    <Select value={vatRateId} onValueChange={setVatRateId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={vatRates.length ? "Choisir…" : "Aucun taux disponible"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vatRates.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {v.value != null ? ` (${v.value}%)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <ProductCombobox
                organizationId={organizationId}
                value={selectedProductId}
                onChange={(id, name) => {
                  setSelectedProductId(id);
                  setSelectedProductName(name);
                }}
              />
            )}
          </div>

          {/* Référence fournisseur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Réf. article</Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="TG-123" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Désignation fournisseur</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Beurre doux 1kg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PU HT (€)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unité de commande</Label>
              <OrderUnitField value={unit} onChange={setUnit} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Contenance par unité commandée</Label>
              <Input
                value={unitsPerPackage}
                onChange={(e) => setUnitsPerPackage(e.target.value)}
                inputMode="decimal"
                placeholder="ex : 1 (kg par bouteille, litres par bidon…)"
              />
              <p className="text-muted-foreground text-xs">
                Quantité en unité de stockage reçue pour 1 unité commandée. Laissez vide si identique.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? "Création…" : "Créer et associer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
