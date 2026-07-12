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
import { type AllergenKey } from "@/lib/constants/product-attributes";
import { useEstablishmentStockOwner } from "@/lib/queries/establishments-queries";
import { useAddPurchasePrice } from "@/lib/queries/purchase-price-queries";
import { ensureSelfStock, useCreateReception } from "@/lib/queries/reception-queries";
import {
  useActiveSuppliers,
  useCreateSupplier,
  useCreateSupplierReference,
  useSupplierReferences,
  useUpdateSupplierReference,
} from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";

import { AmountsFields } from "./product-dashboard-reception-amounts";
import { GestionUnitField, NewRefSection } from "./product-dashboard-reception-modal-fields";
import {
  A_LA_PIECE,
  BASIS_PACK,
  canSubmitAll,
  computeReferenceUnits,
  deriveState,
  NEW,
  ORDER_BASIS,
  parsePositive,
  qtyOrderLabel,
  resolveStockUnit,
  type Mode,
  type Ref,
  refLabel,
  stockUnitFromRef,
  toOrderUnitPrice,
  VRAC,
} from "./product-dashboard-reception-modal-parts";

type Props = {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string | null;
  stockUnit: string | null;
  currentStock: number;
  onClose: () => void;
  mode?: Mode;
  manageStock?: boolean;
};

function modalText(isPrice: boolean, showFirstRefHint: boolean) {
  const title = isPrice ? "Ajouter un prix d'achat" : "Nouvelle réception";
  const base = isPrice
    ? "Enregistrez un tarif fournisseur pour une référence (sans entrée de stock)."
    : "Choisissez le fournisseur et la référence reçue, puis saisissez la quantité.";
  const description = showFirstRefHint
    ? `${base} L'unité de gestion du stock sera figée à cette première référence.`
    : base;
  return { title, description };
}

/** Prix ramené à l'unité de commande selon la base choisie (null si pas de prix). */
function orderPrice(pu: number | null, basis: string, factor: number, stockUnit: string): number | null {
  return pu != null ? toOrderUnitPrice(pu, basis, factor, stockUnit) : null;
}

export function ReceptionModal(props: Props) {
  const {
    productId,
    organizationId,
    establishmentId,
    productStockId,
    stockUnit,
    currentStock,
    onClose,
    mode = "reception",
    manageStock = true,
  } = props;
  const t = useTranslations("units");
  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const { data: refsData = [] } = useSupplierReferences(productId);
  const refs = refsData as Ref[];
  const createSupplier = useCreateSupplier(organizationId);
  const createRef = useCreateSupplierReference(productId);
  const updateRef = useUpdateSupplierReference(productId);
  const createReception = useCreateReception(productId, organizationId, establishmentId);
  const stockOwner = useEstablishmentStockOwner(establishmentId);
  const addPrice = useAddPurchasePrice(productId, organizationId);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [refId, setRefId] = useState("");
  const [designation, setDesignation] = useState("");
  const [refArticle, setRefArticle] = useState("");
  const [contenanceStr, setContenanceStr] = useState("1");
  const [contenanceUnit, setContenanceUnit] = useState("");
  const [gestionUnit, setGestionUnit] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [puStr, setPuStr] = useState("");
  const [recPriceBasis, setRecPriceBasis] = useState(ORDER_BASIS);
  const [notes, setNotes] = useState("");
  const [packaging, setPackaging] = useState(VRAC);
  const [priceBasis, setPriceBasis] = useState("");
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);

  const isPrice = mode === "price";
  const showGestionPicker = manageStock && stockUnit == null;

  const d = deriveState(refs, supplierId, refId, contenanceStr, "");
  // Référence existante sans unité de stock figée : on déduit l'unité de gestion de la référence.
  const derivedRefStockUnit = stockUnitFromRef(d.selectedRef);
  const effectiveStockUnit = resolveStockUnit(stockUnit, gestionUnit, derivedRefStockUnit);
  const qty = parsePositive(qtyStr);
  const pu = parsePositive(puStr);
  // Prix ramené à l'unité de commande selon la base choisie (€/plaquette ou €/kg) — réf existante.
  const puPerOrder = orderPrice(pu, recPriceBasis, d.factor, effectiveStockUnit);
  const contenance = parsePositive(contenanceStr) ?? 1;
  // Traduction de la « phrase » (pour la création de référence et l'aperçu quantité).
  const ru = computeReferenceUnits({
    packaging,
    contenance,
    contenanceUnit,
    stockUnit: effectiveStockUnit,
    priceValue: pu ?? 0,
    priceBasis,
  });

  const busy = [
    createSupplier.isPending,
    createRef.isPending,
    updateRef.isPending,
    createReception.isPending,
    addPrice.isPending,
  ].some(Boolean);

  // Nouvelle référence → formulaire « phrase » (prix + réception). Existante → montants classiques.
  const canSubmit = canSubmitAll(d, {
    isPrice,
    mode,
    manageStock,
    busy,
    qty,
    pu,
    newSupplierName,
    packaging,
    contenanceStr,
    priceBasis,
    effectiveStockUnit,
  });
  const text = modalText(isPrice, showGestionPicker);
  const stockUnitLabel = effectiveStockUnit || "—";

  const onPackagingChange = (v: string) => {
    setPackaging(v);
    if (v === A_LA_PIECE) {
      setPriceBasis(BASIS_PACK);
      if (showGestionPicker) setGestionUnit("piece");
    } else if (v === VRAC) {
      setPriceBasis("");
    } else {
      setPriceBasis(BASIS_PACK);
    }
  };

  const ensureSupplier = async () =>
    d.isNewSupplier ? createSupplier.mutateAsync({ name: newSupplierName.trim(), is_active: true }) : supplierId;

  const createPhraseRef = async (supId: string) =>
    createRef.mutateAsync({
      supplier_id: supId,
      organization_id: organizationId,
      order_unit: ru.orderUnit,
      conversion_factor: ru.conversionFactor,
      unit_price: ru.unitPrice,
      packaging: ru.packaging,
      supplier_product_ref: refArticle.trim() !== "" ? refArticle.trim() : null,
      supplier_product_name: designation.trim() !== "" ? designation.trim() : null,
      allergens,
      origins,
    });

  const submitReception = async () => {
    if (d.selectedRef) {
      createReception.mutate(
        {
          productStockId,
          stockUnit: effectiveStockUnit,
          supplierRefId: d.selectedRef.id,
          supplierId,
          orderQty: qty as number,
          unitPrice: puPerOrder as number,
          conversionFactor: d.factor,
          notes,
          stockOwner,
        },
        { onSuccess: onClose },
      );
      return;
    }
    const supId = await ensureSupplier();
    const newRefId = await createPhraseRef(supId);
    createReception.mutate(
      {
        productStockId,
        stockUnit: effectiveStockUnit,
        supplierRefId: newRefId,
        supplierId: supId,
        orderQty: qty as number,
        unitPrice: ru.unitPrice,
        conversionFactor: ru.conversionFactor,
        notes,
        stockOwner,
      },
      { onSuccess: onClose },
    );
  };

  const submitPrice = async () => {
    if (showGestionPicker) {
      await ensureSelfStock(createClient(), {
        productId,
        establishmentId,
        organizationId,
        desiredUnit: effectiveStockUnit,
      });
    }
    const supId = await ensureSupplier();
    const today = new Date().toISOString().slice(0, 10);
    const supplierRef = refArticle.trim() !== "" ? refArticle.trim() : undefined;

    // Référence existante : on met juste à jour le prix.
    if (d.selectedRef) {
      await updateRef.mutateAsync({ id: d.selectedRef.id, patch: { unit_price: puPerOrder } });
      const unitCost = Math.round(((puPerOrder as number) / (d.factor > 0 ? d.factor : 1)) * 100000) / 100000;
      addPrice.mutate(
        {
          unit_cost: unitCost,
          effective_from: today,
          supplier_reference_id: d.selectedRef.id,
          supplier_id: supId,
          supplier_ref: supplierRef,
        },
        { onSuccess: onClose },
      );
      return;
    }

    // Nouvelle référence via la « phrase ».
    const newRefId = await createPhraseRef(supId);
    addPrice.mutate(
      {
        unit_cost: ru.unitCost,
        effective_from: today,
        supplier_reference_id: newRefId,
        supplier_id: supId,
        supplier_ref: supplierRef,
      },
      { onSuccess: onClose },
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || pu == null) {
      toast.error("Complétez le fournisseur, la référence et le prix.");
      return;
    }
    try {
      if (isPrice) await submitPrice();
      else await submitReception();
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
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select
              value={supplierId || undefined}
              onValueChange={(v) => {
                setSupplierId(v);
                setRefId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un fournisseur…" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW}>+ Nouveau fournisseur</SelectItem>
              </SelectContent>
            </Select>
            {d.isNewSupplier && (
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nom du fournisseur"
                autoFocus
              />
            )}
          </div>

          {d.showRefSelect && (
            <div className="space-y-2">
              <Label>Référence</Label>
              <Select value={refId || undefined} onValueChange={setRefId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une référence…" />
                </SelectTrigger>
                <SelectContent>
                  {d.supplierRefs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {refLabel(r)}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW}>+ Nouvelle référence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {d.showNewRef && (
            <NewRefSection
              showGestionPicker={showGestionPicker}
              setGestionUnit={setGestionUnit}
              packaging={packaging}
              onPackagingChange={onPackagingChange}
              priceBasis={priceBasis}
              setPriceBasis={setPriceBasis}
              puStr={puStr}
              setPuStr={setPuStr}
              contenanceStr={contenanceStr}
              setContenanceStr={setContenanceStr}
              contenanceUnit={contenanceUnit}
              setContenanceUnit={setContenanceUnit}
              designation={designation}
              setDesignation={setDesignation}
              refArticle={refArticle}
              setRefArticle={setRefArticle}
              stockUnit={effectiveStockUnit}
              allergens={allergens}
              setAllergens={setAllergens}
              origins={origins}
              setOrigins={setOrigins}
              t={t}
            />
          )}

          <GestionUnitField
            show={showGestionPicker}
            hasRef={d.selectedRef != null}
            orderUnit={d.effectiveOrderUnit}
            value={effectiveStockUnit}
            onChange={setGestionUnit}
            t={t}
          />

          {d.hasSupplier && !d.showNewRef && (
            <AmountsFields
              showQty={!isPrice}
              qtyStr={qtyStr}
              setQtyStr={setQtyStr}
              puStr={puStr}
              setPuStr={setPuStr}
              orderUnit={d.effectiveOrderUnit}
              stockUnit={stockUnitLabel}
              factor={d.factor}
              currentStock={currentStock}
              priceBasis={recPriceBasis}
              setPriceBasis={setRecPriceBasis}
            />
          )}

          {d.showNewRef && !isPrice && (
            <AmountsFields
              showQty
              showPrice={false}
              qtyStr={qtyStr}
              setQtyStr={setQtyStr}
              puStr={puStr}
              setPuStr={setPuStr}
              orderUnit={qtyOrderLabel(packaging, ru.orderUnit)}
              stockUnit={stockUnitLabel}
              factor={ru.conversionFactor}
              currentStock={currentStock}
            />
          )}

          {!isPrice && (
            <div className="space-y-2">
              <Label>Notes BL (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="N° BL, date de livraison…"
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {busy ? "Enregistrement…" : text.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
