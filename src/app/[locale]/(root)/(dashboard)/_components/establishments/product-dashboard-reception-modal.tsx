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
import { Textarea } from "@/components/ui/textarea";
import { useAddStockMovement } from "@/lib/queries/stock-movement-queries";
import { useSupplierReferences } from "@/lib/queries/supplier-queries";
import { orderQtyToStockQty, unitCostFromTotal } from "@/lib/utils/unit-conversion";

type Props = {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string;
  stockUnit: string | null;
  currentStock: number;
  onClose: () => void;
};

type Ref = {
  id: string;
  supplier_id: string;
  supplier: { name: string } | null;
  supplier_product_name: string | null;
  order_unit: string | null;
  conversion_factor: number;
};

function refLabel(ref: Ref): string {
  const supplier = ref.supplier?.name ?? "—";
  const name = ref.supplier_product_name ? ` · ${ref.supplier_product_name}` : "";
  const factor = ref.conversion_factor !== 1 ? ` ×${ref.conversion_factor}` : "";
  const unit = ref.order_unit ? ` (${ref.order_unit}${factor})` : "";
  return `${supplier}${name}${unit}`;
}

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Calc = { stockQty: number | null; stockAfter: number | null; unitCost: number | null };

function computeReception(ref: Ref | null, orderQtyStr: string, totalPriceStr: string, currentStock: number): Calc {
  const orderQty = parsePositive(orderQtyStr);
  const totalPrice = parsePositive(totalPriceStr);
  const stockQty = ref != null && orderQty != null ? orderQtyToStockQty(orderQty, ref.conversion_factor) : null;
  const stockAfter = stockQty != null ? Math.round((currentStock + stockQty) * 1000) / 1000 : null;
  const unitCost = stockQty != null && totalPrice != null ? unitCostFromTotal(totalPrice, stockQty) : null;
  return { stockQty, stockAfter, unitCost };
}

function ReceptionFields({
  refs,
  selectedRefId,
  setSelectedRefId,
  orderQtyStr,
  setOrderQtyStr,
  totalPriceStr,
  setTotalPriceStr,
  notes,
  setNotes,
  stockUnit,
  selectedRef,
  calc,
}: {
  refs: Ref[];
  selectedRefId: string;
  setSelectedRefId: (v: string) => void;
  orderQtyStr: string;
  setOrderQtyStr: (v: string) => void;
  totalPriceStr: string;
  setTotalPriceStr: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  stockUnit: string | null;
  selectedRef: Ref | null;
  calc: Calc;
}) {
  const unitSuffix = stockUnit ?? "";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Référence fournisseur</Label>
        <Select value={selectedRefId || undefined} onValueChange={setSelectedRefId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une référence…" />
          </SelectTrigger>
          <SelectContent>
            {refs.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {refLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Quantité reçue{selectedRef?.order_unit ? ` (${selectedRef.order_unit})` : ""}</Label>
          <Input
            value={orderQtyStr}
            onChange={(e) => setOrderQtyStr(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="tabular-nums"
          />
          {calc.stockQty != null && (
            <p className="text-muted-foreground text-xs">
              →{" "}
              <strong>
                {calc.stockQty} {unitSuffix}
              </strong>{" "}
              en stock
              {calc.stockAfter != null ? ` · après : ${calc.stockAfter} ${unitSuffix}` : ""}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Prix total HT (€) <span className="text-muted-foreground text-xs font-normal">ligne BL</span>
          </Label>
          <Input
            value={totalPriceStr}
            onChange={(e) => setTotalPriceStr(e.target.value)}
            inputMode="decimal"
            placeholder="ex: 60.00"
            className="tabular-nums"
          />
          {calc.unitCost != null && (
            <p className="text-muted-foreground text-xs">
              → coût FIFO :{" "}
              <strong>
                {calc.unitCost} €/{unitSuffix}
              </strong>
            </p>
          )}
        </div>
      </div>

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
    </div>
  );
}

export function ReceptionModal({
  productId,
  organizationId,
  establishmentId,
  productStockId,
  stockUnit,
  currentStock,
  onClose,
}: Props) {
  const { data: refsData = [], isLoading } = useSupplierReferences(productId);
  const refs = refsData as Ref[];
  const addMovement = useAddStockMovement(productId, organizationId, establishmentId, productStockId, stockUnit);

  const [selectedRefId, setSelectedRefId] = useState("");
  const [orderQtyStr, setOrderQtyStr] = useState("");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [notes, setNotes] = useState("");

  const selectedRef = refs.find((r) => r.id === selectedRefId) ?? null;
  const calc = computeReception(selectedRef, orderQtyStr, totalPriceStr, currentStock);
  const canSubmit =
    selectedRef != null && calc.stockQty != null && parsePositive(totalPriceStr) != null && !addMovement.isPending;

  const handleSubmit = () => {
    const totalPrice = parsePositive(totalPriceStr);
    if (!selectedRef || calc.stockQty == null || totalPrice == null) {
      toast.error("Sélectionnez une référence fournisseur et renseignez quantité et prix.");
      return;
    }
    addMovement.mutate(
      {
        movementType: "purchase",
        quantity: calc.stockQty,
        notes: notes.trim(),
        currentStock,
        totalPrice,
        supplierRefId: selectedRef.id,
        conversionFactor: selectedRef.conversion_factor,
        supplierId: selectedRef.supplier_id,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle réception</DialogTitle>
          <DialogDescription>
            Choisissez une référence fournisseur du produit, puis saisissez la quantité reçue et le prix de la ligne.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Chargement…</p>
        ) : refs.length === 0 ? (
          <div className="space-y-3 py-4">
            <p className="text-muted-foreground text-sm">
              Aucun fournisseur n&apos;est configuré pour ce produit. Ajoutez-en un dans la section{" "}
              <strong>Paramètres fournisseurs</strong> ci-dessous avant d&apos;enregistrer une réception.
            </p>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <ReceptionFields
              refs={refs}
              selectedRefId={selectedRefId}
              setSelectedRefId={setSelectedRefId}
              orderQtyStr={orderQtyStr}
              setOrderQtyStr={setOrderQtyStr}
              totalPriceStr={totalPriceStr}
              setTotalPriceStr={setTotalPriceStr}
              notes={notes}
              setNotes={setNotes}
              stockUnit={stockUnit}
              selectedRef={selectedRef}
              calc={calc}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
                {addMovement.isPending ? "Enregistrement…" : "Enregistrer la réception"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
