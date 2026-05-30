"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OptionGroupWithValues } from "@/lib/queries/product-option-groups-queries";
import type { Tables } from "@/lib/supabase/database.types";

export type VatRate = { id: string; name: string | null; value: number | null };

export function GroupDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Tables<"product_option_groups"> | null;
  onSave: (row: Partial<Tables<"product_option_groups">>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState("unique");
  const [isRequired, setIsRequired] = useState(false);
  const [maxSelections, setMaxSelections] = useState("1");
  const [allowQuantity, setAllowQuantity] = useState(false);
  const [autoOpenModal, setAutoOpenModal] = useState(false);
  const [displayOrder, setDisplayOrder] = useState("0");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setSelectionType(initial.selection_type ?? "unique");
      setIsRequired(initial.is_required);
      setMaxSelections(String(initial.max_selections ?? 1));
      setAllowQuantity(initial.allow_quantity);
      setAutoOpenModal(initial.auto_open_modal);
      setDisplayOrder(String(initial.display_order));
    } else {
      setName("");
      setSelectionType("unique");
      setIsRequired(false);
      setMaxSelections("1");
      setAllowQuantity(false);
      setAutoOpenModal(false);
      setDisplayOrder("0");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le groupe" : "Nouveau groupe d'options"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Nom du groupe</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Cuisson, Taille…" />
          </div>
          <div className="space-y-1">
            <Label>Mode de sélection</Label>
            <Select value={selectionType} onValueChange={setSelectionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unique">Choix unique (radio)</SelectItem>
                <SelectItem value="unlimited">Quantité libre</SelectItem>
                <SelectItem value="limited">Multiple limité</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectionType === "limited" && (
            <div className="space-y-1">
              <Label>Nb max de sélections</Label>
              <Input
                value={maxSelections}
                onChange={(e) => setMaxSelections(e.target.value)}
                type="number"
                min={1}
                className="max-w-[8rem]"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} id="gr-req" />
              <Label htmlFor="gr-req" className="cursor-pointer font-normal">
                Obligatoire
              </Label>
            </div>
            {selectionType !== "unique" && (
              <div className="flex items-center gap-2">
                <Switch checked={allowQuantity} onCheckedChange={setAllowQuantity} id="gr-qty" />
                <Label htmlFor="gr-qty" className="cursor-pointer font-normal">
                  Compteur +/−
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={autoOpenModal} onCheckedChange={setAutoOpenModal} id="gr-auto" />
              <Label htmlFor="gr-auto" className="cursor-pointer font-normal">
                Ouvrir automatiquement
              </Label>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Ordre d&apos;affichage</Label>
            <Input
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              type="number"
              className="max-w-[8rem]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (!name.trim()) {
                toast.error("Le nom est requis.");
                return;
              }
              onSave({
                name: name.trim(),
                selection_type: selectionType,
                is_required: isRequired,
                max_selections: selectionType === "limited" ? Number(maxSelections) : null,
                allow_quantity: selectionType === "unique" ? false : allowQuantity,
                auto_open_modal: autoOpenModal,
                display_order: Number(displayOrder),
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

export function ValueDialog({
  open,
  onOpenChange,
  initial,
  group,
  vatRates,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Tables<"product_option_group_values"> | null;
  group: OptionGroupWithValues;
  vatRates: VatRate[];
  onSave: (row: Partial<Tables<"product_option_group_values">>) => void;
  pending: boolean;
}) {
  const defaultTva = String(vatRates.find((r) => r.value !== null)?.value ?? 20);
  const [optionName, setOptionName] = useState("");
  const [optionValue, setOptionValue] = useState("");
  const [price, setPrice] = useState("0");
  const [tva, setTva] = useState(defaultTva);
  const [minQty, setMinQty] = useState("0");
  const [maxQty, setMaxQty] = useState("1");
  const [isDefault, setIsDefault] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setOptionName(initial.option_name);
      setOptionValue(initial.option_value);
      setPrice(String(initial.option_price));
      setTva(String(initial.tva_rate));
      setMinQty(String(initial.min_quantity ?? 0));
      setMaxQty(String(initial.max_quantity ?? 1));
      setIsDefault(initial.is_default);
      setIsVisible(initial.is_visible);
      setDisplayOrder(String(initial.display_order));
    } else {
      setOptionName("");
      setOptionValue("");
      setPrice("0");
      setTva(defaultTva);
      setMinQty("0");
      setMaxQty("1");
      setIsDefault(false);
      setIsVisible(true);
      setDisplayOrder("0");
    }
  }, [open, initial, defaultTva]);

  const filteredRates = vatRates.filter((r) => r.value !== null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la valeur" : `Nouvelle valeur — ${group.name}`}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="Ex : Fromage" />
            </div>
            <div className="space-y-1">
              <Label>Valeur</Label>
              <Input value={optionValue} onChange={(e) => setOptionValue(e.target.value)} placeholder="Ex : Parmesan" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Prix (€)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>TVA</Label>
              {filteredRates.length > 0 ? (
                <Select value={tva} onValueChange={setTva}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRates.map((r) => (
                      <SelectItem key={r.id} value={String(r.value)}>
                        {r.value}%{r.name ? ` — ${r.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={tva} onChange={(e) => setTva(e.target.value)} inputMode="decimal" />
              )}
            </div>
          </div>
          {group.allow_quantity && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Qté min</Label>
                <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} type="number" min={0} />
              </div>
              <div className="space-y-1">
                <Label>Qté max</Label>
                <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} type="number" min={1} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Ordre</Label>
            <Input
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              type="number"
              className="max-w-[8rem]"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} id="val-def" />
              <Label htmlFor="val-def" className="cursor-pointer font-normal">
                Par défaut
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isVisible} onCheckedChange={setIsVisible} id="val-vis" />
              <Label htmlFor="val-vis" className="cursor-pointer font-normal">
                Visible
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const p = Number(price.replace(",", "."));
              const t = Number(tva.replace(",", "."));
              if (!optionName.trim() || !optionValue.trim()) {
                toast.error("Nom et valeur requis.");
                return;
              }
              if (!Number.isFinite(p) || !Number.isFinite(t)) {
                toast.error("Nombre invalide.");
                return;
              }
              onSave({
                option_name: optionName.trim(),
                option_value: optionValue.trim(),
                option_price: p,
                tva_rate: t,
                min_quantity: group.allow_quantity ? Number(minQty) : null,
                max_quantity: group.allow_quantity ? Number(maxQty) : null,
                is_default: isDefault,
                is_visible: isVisible,
                display_order: Number(displayOrder),
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
