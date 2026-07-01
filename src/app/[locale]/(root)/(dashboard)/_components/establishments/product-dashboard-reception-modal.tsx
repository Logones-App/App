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
import { convertUnit } from "@/lib/utils/unit-conversion";

import {
  AmountsFields,
  computeCanSubmit,
  deriveState,
  GestionUnitField,
  NEW,
  NewReferenceFields,
  parsePositive,
  resolveStockUnit,
  type Mode,
  type Ref,
  refLabel,
  resolveSupplierAndRef,
  stockUnitFromRef,
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
    : "Choisissez le fournisseur et la référence reçue, puis saisissez la quantité et le prix unitaire.";
  const description = showFirstRefHint
    ? `${base} L'unité de gestion du stock sera figée à cette première référence.`
    : base;
  return { title, description };
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
  const addPrice = useAddPurchasePrice(productId, organizationId);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [refId, setRefId] = useState("");
  const [designation, setDesignation] = useState("");
  const [refArticle, setRefArticle] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [contenanceStr, setContenanceStr] = useState("1");
  const [gestionUnit, setGestionUnit] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [puStr, setPuStr] = useState("");
  const [notes, setNotes] = useState("");

  const isPrice = mode === "price";
  const showGestionPicker = manageStock && stockUnit == null;

  const d = deriveState(refs, supplierId, refId, contenanceStr, orderUnit);
  // Produit sans unité de stock + référence existante choisie : on déduit l'unité de gestion
  // de la référence (order_unit + conversion_factor) — sinon le formulaire était en impasse.
  const derivedRefStockUnit = stockUnitFromRef(d.selectedRef);
  const effectiveStockUnit = resolveStockUnit(stockUnit, gestionUnit, derivedRefStockUnit);
  const qty = parsePositive(qtyStr);
  const pu = parsePositive(puStr);
  const busy = [
    createSupplier.isPending,
    createRef.isPending,
    updateRef.isPending,
    createReception.isPending,
    addPrice.isPending,
  ].some(Boolean);
  const canSubmit = computeCanSubmit(d, {
    mode,
    manageStock,
    busy,
    qty,
    pu,
    newSupplierName,
    designation,
    effectiveStockUnit,
  });
  const text = modalText(isPrice, showGestionPicker);

  // Conversion dimensionnelle (kg↔g, l↔ml↔cl, ou même unité) → facteur calculé et verrouillé.
  // Non dimensionnel (colis/pièce → g) → saisie manuelle.
  const dimFactor =
    orderUnit !== "" && effectiveStockUnit !== "" ? convertUnit(1, orderUnit, effectiveStockUnit) : null;
  const contenanceLocked = dimFactor != null && dimFactor > 0;

  const applyDimensional = (order: string, gestion: string) => {
    if (order === "") {
      setContenanceStr("1"); // « Aucune » unité de commande → achat dans l'unité de stock, facteur = 1.
      return;
    }
    if (gestion === "") return;
    const dim = convertUnit(1, order, gestion);
    if (dim != null && dim > 0) setContenanceStr(String(dim));
  };

  const onOrderUnitChange = (v: string) => {
    setOrderUnit(v);
    applyDimensional(v, effectiveStockUnit);
  };

  const handleGestionChange = (v: string) => {
    setGestionUnit(v);
    applyDimensional(orderUnit, v);
  };

  const refArgs = () => ({
    d,
    organizationId,
    newSupplierName,
    supplierId,
    orderUnit,
    designation,
    refArticle,
    pu: pu as number,
    createSupplier,
    createRef,
  });

  const submitReception = async () => {
    const { supId, refId: resolvedRefId } = await resolveSupplierAndRef(refArgs());
    createReception.mutate(
      {
        productStockId,
        stockUnit: effectiveStockUnit,
        supplierRefId: resolvedRefId,
        supplierId: supId,
        orderQty: qty as number,
        unitPrice: pu as number,
        conversionFactor: d.factor,
        notes,
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
    const { supId, refId: resolvedRefId } = await resolveSupplierAndRef(refArgs());
    if (d.selectedRef) await updateRef.mutateAsync({ id: resolvedRefId, patch: { unit_price: pu } });
    const unitCost = Math.round(((pu as number) / (d.factor > 0 ? d.factor : 1)) * 100000) / 100000;
    addPrice.mutate(
      {
        unit_cost: unitCost,
        effective_from: new Date().toISOString().slice(0, 10),
        supplier_reference_id: resolvedRefId,
        supplier_id: supId,
        supplier_ref: refArticle.trim() !== "" ? refArticle.trim() : undefined,
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
            <NewReferenceFields
              designation={designation}
              setDesignation={setDesignation}
              refArticle={refArticle}
              setRefArticle={setRefArticle}
              orderUnit={orderUnit}
              onOrderUnitChange={onOrderUnitChange}
              contenanceStr={contenanceStr}
              setContenanceStr={setContenanceStr}
              contenanceLocked={contenanceLocked}
              gestionUnit={effectiveStockUnit}
              onGestionUnitChange={showGestionPicker ? handleGestionChange : null}
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

          {d.hasSupplier && (
            <AmountsFields
              showQty={!isPrice}
              qtyStr={qtyStr}
              setQtyStr={setQtyStr}
              puStr={puStr}
              setPuStr={setPuStr}
              orderUnit={d.effectiveOrderUnit}
              stockUnit={effectiveStockUnit || "—"}
              factor={d.factor}
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
