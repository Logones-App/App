"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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

type CompositionRow = Tables<"product_compositions">;

type Props = {
  composition: CompositionRow;
  componentName: string;
  currentUnitCost: number | null;
  organizationId: string;
  queryKey: unknown[];
  onClose: () => void;
};

export function CompositionEditModal({
  composition,
  componentName,
  currentUnitCost,
  organizationId,
  queryKey,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

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
  const [purchasePrice, setPurchasePrice] = useState(currentUnitCost != null ? String(currentUnitCost) : "");

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
        })
        .eq("id", composition.id);
      if (error) throw error;

      const ppNum = parseFloat(purchasePrice.replace(",", "."));
      if (Number.isFinite(ppNum) && ppNum > 0 && ppNum !== currentUnitCost) {
        const { error: ppErr } = await supabase.from("product_purchase_price_history").insert({
          product_id: composition.component_product_id,
          organization_id: organizationId,
          unit_cost: Math.round(ppNum * 10000) / 10000,
          effective_from: new Date().toISOString().slice(0, 10),
          currency: "EUR",
        });
        if (ppErr) throw ppErr;
      }
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
            <Label>Unité</Label>
            <Select value={unit || "__none__"} onValueChange={(v) => setUnit(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="— Aucune" />
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
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Prix d&apos;achat HT{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (par unité — laisser vide pour ne pas modifier)
              </span>
            </Label>
            <div className="relative">
              <Input
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                inputMode="decimal"
                placeholder={currentUnitCost != null ? String(currentUnitCost) : "0,00"}
                className="pr-6 tabular-nums"
              />
              <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
            </div>
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
          <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
