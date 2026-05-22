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

type Props = {
  open: boolean;
  productName: string;
  onConfirm: (price: number) => void;
  onCancel: () => void;
};

export function MenuGridPriceModal({ open, productName, onConfirm, onCancel }: Props) {
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRaw("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const parsed = parseFloat(raw.replace(",", "."));
  const isValid = raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(Math.round(parsed * 100) / 100);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Prix dans ce menu</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{productName}</span> n&apos;a pas encore de prix dans ce menu. Saisissez le
            prix de vente TTC.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
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
