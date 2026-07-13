"use client";

import { useEffect, useRef, useState } from "react";

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

export type MenuGridVatOption = { id: string; label: string };

type Props = {
  open: boolean;
  productName: string;
  /** true si le produit n'a pas encore de prix dans ce menu (menus_products absent). */
  needsPrice: boolean;
  /** true si le produit n'a pas de TVA (products.vat_rate_id null) → sélecteur affiché. */
  needsVat: boolean;
  vatOptions: MenuGridVatOption[];
  onConfirm: (v: { price?: number; vatRateId?: string }) => void;
  onCancel: () => void;
};

export function MenuGridPriceModal({
  open,
  productName,
  needsPrice,
  needsVat,
  vatOptions,
  onConfirm,
  onCancel,
}: Props) {
  const [raw, setRaw] = useState("");
  const [vatRateId, setVatRateId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRaw("");
      setVatRateId("");
      if (needsPrice) setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, needsPrice]);

  const parsed = parseFloat(raw.replace(",", "."));
  const priceValid = !needsPrice || (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0);
  const vatValid = !needsVat || vatRateId !== "";
  const isValid = priceValid && vatValid;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      price: needsPrice ? Math.round(parsed * 100) / 100 : undefined,
      vatRateId: needsVat ? vatRateId : undefined,
    });
  };

  const description =
    needsPrice && needsVat
      ? "n'a pas encore de prix ni de TVA. Renseignez le prix de vente TTC et le taux de TVA."
      : needsPrice
        ? "n'a pas encore de prix dans ce menu. Saisissez le prix de vente TTC."
        : "n'a pas de TVA. Sélectionnez le taux de TVA (appliqué au produit).";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Compléter avant l&apos;ajout</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{productName}</span> {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {needsPrice && (
            <div className="space-y-2">
              <Label htmlFor="grid-price-input">Prix TTC</Label>
              <div className="relative">
                <Input
                  id="grid-price-input"
                  ref={inputRef}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-8 tabular-nums"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirm();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      onCancel();
                    }
                  }}
                />
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
              </div>
            </div>
          )}

          {needsVat && (
            <div className="space-y-2">
              <Label>TVA (appliquée au produit)</Label>
              <Select value={vatRateId} onValueChange={setVatRateId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={vatOptions.length === 0 ? "Aucun taux configuré" : "Sélectionner un taux"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {vatOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" disabled={!isValid} onClick={handleConfirm}>
            Ajouter à la grille
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
