"use client";

import { useEffect, useState } from "react";

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
import type { Tables } from "@/lib/supabase/database.types";

export function ProductOptionDialog({
  open,
  onOpenChange,
  initial,
  defaultDisplayOrder,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Tables<"product_options"> | null;
  defaultDisplayOrder: number;
  onSave: (row: Partial<Tables<"product_options">>) => void;
  pending: boolean;
}) {
  const [option_group, setOptionGroup] = useState("");
  const [option_name, setOptionName] = useState("");
  const [option_value, setOptionValue] = useState("");
  const [option_price, setOptionPrice] = useState("0");
  const [tva_rate, setTvaRate] = useState("20");
  const [selection_type, setSelectionType] = useState("single");
  const [display_order, setDisplayOrder] = useState(String(defaultDisplayOrder));
  const [is_visible, setIsVisible] = useState(true);
  const [is_required, setIsRequired] = useState(false);
  const [is_default, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setOptionGroup(initial.option_group ?? "");
      setOptionName(initial.option_name);
      setOptionValue(initial.option_value);
      setOptionPrice(String(initial.option_price));
      setTvaRate(String(initial.tva_rate));
      setSelectionType(initial.selection_type);
      setDisplayOrder(String(initial.display_order));
      setIsVisible(initial.is_visible !== false);
      setIsRequired(Boolean(initial.is_required));
      setIsDefault(Boolean(initial.is_default));
    } else {
      setOptionGroup("");
      setOptionName("");
      setOptionValue("");
      setOptionPrice("0");
      setTvaRate("20");
      setSelectionType("single");
      setDisplayOrder(String(defaultDisplayOrder));
      setIsVisible(true);
      setIsRequired(false);
      setIsDefault(false);
    }
  }, [open, initial, defaultDisplayOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'option" : "Nouvelle option"}</DialogTitle>
          <DialogDescription>Champs alignés sur la table product_options.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Groupe</Label>
            <Input value={option_group} onChange={(e) => setOptionGroup(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nom</Label>
            <Input value={option_name} onChange={(e) => setOptionName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Valeur</Label>
            <Input value={option_value} onChange={(e) => setOptionValue(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Prix</Label>
              <Input
                value={option_price}
                onChange={(e) => setOptionPrice(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label>TVA (%)</Label>
              <Input value={tva_rate} onChange={(e) => setTvaRate(e.target.value)} type="text" inputMode="decimal" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Type de sélection</Label>
            <Select value={selection_type} onValueChange={setSelectionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">single</SelectItem>
                <SelectItem value="multiple">multiple</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ordre</Label>
            <Input value={display_order} onChange={(e) => setDisplayOrder(e.target.value)} type="number" />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={is_visible} onCheckedChange={setIsVisible} id="opt-vis" />
              <Label htmlFor="opt-vis">Visible</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_required} onCheckedChange={setIsRequired} id="opt-req" />
              <Label htmlFor="opt-req">Obligatoire</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_default} onCheckedChange={setIsDefault} id="opt-def" />
              <Label htmlFor="opt-def">Défaut</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              const price = Number(option_price.replace(",", "."));
              const tva = Number(tva_rate.replace(",", "."));
              const ord = Number(display_order);
              if (!option_name.trim() || !option_value.trim()) {
                toast.error("Nom et valeur sont requis.");
                return;
              }
              if (!Number.isFinite(price) || !Number.isFinite(tva) || !Number.isFinite(ord)) {
                toast.error("Nombre invalide.");
                return;
              }
              onSave({
                option_group: option_group.trim() || null,
                option_name: option_name.trim(),
                option_value: option_value.trim(),
                option_price: price,
                tva_rate: tva,
                selection_type,
                display_order: ord,
                is_visible: is_visible,
                is_required,
                is_default,
              });
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
