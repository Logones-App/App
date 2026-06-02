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
import { Switch } from "@/components/ui/switch";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { areUnitsCompatible, compatibleUnits, toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

type CompositionRow = Tables<"product_compositions">;

function UnitCostLine({ cost, portionUnit }: { cost: number | null; portionUnit: string | null }) {
  if (cost == null) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun prix enregistré — ajouter depuis l&apos;onglet Fournisseurs.
      </p>
    );
  }
  const { value, displayUnit } = toFriendlyUnitCost(cost, portionUnit);
  return (
    <p className="text-sm tabular-nums">
      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)}
      {displayUnit && <span className="text-muted-foreground"> / {displayUnit}</span>}
      <span className="text-muted-foreground ml-2 text-xs">(modifier depuis l&apos;onglet Fournisseurs)</span>
    </p>
  );
}

function ConversionSection({
  needsConversion,
  unitIncompatibleWithStock,
  portionUnit,
  unit,
  value,
  onChange,
}: {
  needsConversion: boolean;
  unitIncompatibleWithStock: boolean;
  portionUnit: string | null | undefined;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!needsConversion || unitIncompatibleWithStock) return null;
  const portionLabel = portionUnit === "piece" ? "pièce" : portionUnit;
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>
        Facteur de conversion{" "}
        <span className="text-muted-foreground text-xs font-normal">
          1 {portionLabel} = ? {unit}
        </span>
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">1 {portionLabel} =</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="ex : 450"
          className="w-28 tabular-nums"
        />
        <span className="text-muted-foreground text-sm">{unit}</span>
      </div>
    </div>
  );
}

function UnitStockWarning({
  isIncompatible,
  stockUnit,
  unit,
  t,
}: {
  isIncompatible: boolean;
  stockUnit: string | null | undefined;
  unit: string;
  t: (k: import("@/lib/constants/product-attributes").PortionUnit) => string;
}) {
  if (!isIncompatible || !stockUnit) return null;
  return (
    <p className="text-xs text-amber-600">
      ⚠ Incohérence : le stock est en{" "}
      <strong>{t(stockUnit as import("@/lib/constants/product-attributes").PortionUnit)}</strong>. Le POS déstockera en
      unité de stock, pas en {unit}.
    </p>
  );
}

type Props = {
  composition: CompositionRow;
  componentName: string;
  componentPortionUnit?: string | null;
  componentStockUnit?: string | null;
  currentUnitCost: number | null;
  organizationId: string;
  queryKey: unknown[];
  onClose: () => void;
};

export function CompositionEditModal({
  composition,
  componentName,
  componentPortionUnit,
  componentStockUnit,
  currentUnitCost,
  queryKey,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const t = useTranslations("units");

  const [kind, setKind] = useState<"recipe" | "modifier">(composition.composition_kind as "recipe" | "modifier");
  const [qty, setQty] = useState(String(composition.default_quantity ?? 1));
  const [unit, setUnit] = useState(composition.quantity_unit ?? "");
  const [maxQty, setMaxQty] = useState(composition.max_quantity != null ? String(composition.max_quantity) : "");
  const [supplement, setSupplement] = useState(
    composition.unit_supplement_price != null ? String(composition.unit_supplement_price) : "",
  );
  const [showInCustom, setShowInCustom] = useState(composition.show_in_customization);
  const [isRequired, setIsRequired] = useState(composition.is_required ?? false);
  const [autoOpen, setAutoOpen] = useState(composition.auto_open_modal ?? false);
  const [conversionFactor, setConversionFactor] = useState(
    (composition as unknown as { conversion_factor: number | null }).conversion_factor != null
      ? String((composition as unknown as { conversion_factor: number | null }).conversion_factor)
      : "",
  );

  const needsConversion = !!unit && !!componentPortionUnit && !areUnitsCompatible(unit, componentPortionUnit);
  const unitIncompatibleWithStock = !!componentStockUnit && !areUnitsCompatible(unit, componentStockUnit);
  // Unités proposées filtrées sur l'unité de stock (référence POS)
  const allowedUnits = compatibleUnits(componentStockUnit ?? componentPortionUnit, PORTION_UNITS);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const qtyNum = parseFloat(qty.replace(",", "."));
      const maxNum = maxQty ? parseFloat(maxQty.replace(",", ".")) : null;
      const suppNum = supplement ? parseFloat(supplement.replace(",", ".")) : null;

      const { error } = await supabase
        .from("product_compositions")
        .update({
          composition_kind: kind,
          default_quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : composition.default_quantity,
          quantity_unit: unit || null,
          max_quantity: kind === "modifier" && maxNum != null && Number.isFinite(maxNum) ? maxNum : null,
          unit_supplement_price: kind === "modifier" && suppNum != null && Number.isFinite(suppNum) ? suppNum : null,
          show_in_customization: showInCustom,
          is_required: isRequired,
          auto_open_modal: autoOpen,
          ...(needsConversion
            ? {
                conversion_factor: (() => {
                  const f = parseFloat(conversionFactor.replace(",", "."));
                  return Number.isFinite(f) && f > 0 ? f : null;
                })(),
              }
            : { conversion_factor: null }),
        })
        .eq("id", composition.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ingrédient mis à jour.");
      void queryClient.invalidateQueries({ queryKey });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la sauvegarde."),
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{componentName}</DialogTitle>
          <DialogDescription>Modifier les paramètres de cet ingrédient dans la recette.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "recipe" | "modifier")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recipe">Recette (BOM) — constitutif, affecte le stock et le coût</SelectItem>
                <SelectItem value="modifier">Modificateur — option client, supplément tarifé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="1" />
          </div>

          <div className="space-y-2">
            <Label>
              Unité
              {componentStockUnit && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  (stock géré en {t(componentStockUnit as import("@/lib/constants/product-attributes").PortionUnit)})
                </span>
              )}
            </Label>
            <Select value={unit || "__none__"} onValueChange={(v) => setUnit(v === "__none__" ? "" : v)}>
              <SelectTrigger className={unitIncompatibleWithStock ? "border-amber-500" : ""}>
                <SelectValue placeholder="— Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucune</SelectItem>
                {allowedUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <UnitStockWarning
              isIncompatible={unitIncompatibleWithStock}
              stockUnit={componentStockUnit}
              unit={unit}
              t={t}
            />
          </div>

          <ConversionSection
            needsConversion={needsConversion}
            unitIncompatibleWithStock={unitIncompatibleWithStock}
            portionUnit={componentPortionUnit}
            unit={unit}
            value={conversionFactor}
            onChange={setConversionFactor}
          />

          <div className="space-y-1 sm:col-span-2">
            <Label>Coût unitaire actuel</Label>
            <UnitCostLine cost={currentUnitCost} portionUnit={componentPortionUnit ?? null} />
          </div>

          {kind === "modifier" && (
            <>
              <div className="space-y-2">
                <Label>Qté max (modificateur)</Label>
                <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} inputMode="decimal" placeholder="—" />
              </div>
              <div className="space-y-2">
                <Label>Prix supplément TTC</Label>
                <div className="relative">
                  <Input
                    value={supplement}
                    onChange={(e) => setSupplement(e.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="pr-6 tabular-nums"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="modal-show-custom" checked={showInCustom} onCheckedChange={setShowInCustom} />
                <Label htmlFor="modal-show-custom">Visible dans la personnalisation POS</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="modal-required" checked={isRequired} onCheckedChange={setIsRequired} />
                <Label htmlFor="modal-required">Requis (sélection obligatoire)</Label>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch id="modal-auto-open" checked={autoOpen} onCheckedChange={setAutoOpen} />
                <Label htmlFor="modal-auto-open">Ouvrir automatiquement la modale au POS</Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={saveMutation.isPending || unitIncompatibleWithStock}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
