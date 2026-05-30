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

type VatRate = { id: string; name: string | null; value: number | null };

const SELECTION_MODES = [
  { value: "unique", label: "Choix unique (radio — ex : cuisson, taille)" },
  { value: "unlimited", label: "Quantité libre (ex : suppléments cumulables)" },
  { value: "limited", label: "Choix multiple limité (ex : 3 garnitures max)" },
] as const;

export function ProductOptionDialog({
  open,
  onOpenChange,
  initial,
  defaultDisplayOrder,
  existingGroups = [],
  vatRates = [],
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Tables<"product_options"> | null;
  defaultDisplayOrder: number;
  existingGroups?: string[];
  vatRates?: VatRate[];
  onSave: (row: Partial<Tables<"product_options">>) => void;
  pending: boolean;
}) {
  const defaultTva = String(vatRates.find((r) => r.value !== null)?.value ?? 20);

  const [groupSelect, setGroupSelect] = useState("__none__");
  const [newGroupName, setNewGroupName] = useState("");
  const [option_name, setOptionName] = useState("");
  const [option_value, setOptionValue] = useState("");
  const [option_price, setOptionPrice] = useState("0");
  const [tva_rate, setTvaRate] = useState(defaultTva);
  const [selection_type, setSelectionType] = useState("unique");
  const [allow_quantity, setAllowQuantity] = useState(false);
  const [min_quantity, setMinQuantity] = useState("0");
  const [max_quantity, setMaxQuantity] = useState("1");
  const [max_selections, setMaxSelections] = useState("1");
  const [display_order, setDisplayOrder] = useState(String(defaultDisplayOrder));
  const [is_visible, setIsVisible] = useState(true);
  const [is_required, setIsRequired] = useState(false);
  const [is_default, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setGroupSelect(initial.option_group ?? "__none__");
      setNewGroupName("");
      setOptionName(initial.option_name);
      setOptionValue(initial.option_value);
      setOptionPrice(String(initial.option_price));
      setTvaRate(String(initial.tva_rate));
      setSelectionType(initial.selection_type ?? "unique");
      setAllowQuantity(Boolean(initial.allow_quantity));
      setMinQuantity(String(initial.min_quantity ?? 0));
      setMaxQuantity(String(initial.max_quantity ?? 1));
      setMaxSelections(String(initial.max_selections ?? 1));
      setDisplayOrder(String(initial.display_order));
      setIsVisible(initial.is_visible !== false);
      setIsRequired(Boolean(initial.is_required));
      setIsDefault(Boolean(initial.is_default));
    } else {
      setGroupSelect("__none__");
      setNewGroupName("");
      setOptionName("");
      setOptionValue("");
      setOptionPrice("0");
      setTvaRate(defaultTva);
      setSelectionType("unique");
      setAllowQuantity(false);
      setMinQuantity("0");
      setMaxQuantity("1");
      setMaxSelections("1");
      setDisplayOrder(String(defaultDisplayOrder));
      setIsVisible(true);
      setIsRequired(false);
      setIsDefault(false);
    }
  }, [open, initial, defaultDisplayOrder, defaultTva]);

  const handleSelectionTypeChange = (v: string) => {
    setSelectionType(v);
    if (v === "unique") {
      setAllowQuantity(false);
      setMinQuantity("1");
      setMaxQuantity("1");
    }
  };

  const resolvedGroup =
    groupSelect === "__new__" ? newGroupName.trim() || null : groupSelect === "__none__" ? null : groupSelect || null;

  const isUnique = selection_type === "unique";
  const filteredVatRates = vatRates.filter((r) => r.value !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'attribut" : "Nouvel attribut"}</DialogTitle>
          <DialogDescription>Caractéristique proposée au client à la commande (cuisson, taille…).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1">
            <Label>Groupe</Label>
            <Select value={groupSelect} onValueChange={setGroupSelect}>
              <SelectTrigger>
                <SelectValue placeholder="— Aucun groupe —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucun groupe —</SelectItem>
                {existingGroups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">— Nouveau groupe —</SelectItem>
              </SelectContent>
            </Select>
            {groupSelect === "__new__" && (
              <Input
                className="mt-1"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nom du nouveau groupe"
                autoFocus
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input
                value={option_name}
                onChange={(e) => setOptionName(e.target.value)}
                placeholder="Ex : Fromage, Cuisson"
              />
            </div>
            <div className="space-y-1">
              <Label>Valeur</Label>
              <Input
                value={option_value}
                onChange={(e) => setOptionValue(e.target.value)}
                placeholder="Ex : Parmesan, Saignante"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prix (€)</Label>
              <Input
                value={option_price}
                onChange={(e) => setOptionPrice(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label>TVA</Label>
              {filteredVatRates.length > 0 ? (
                <Select value={tva_rate} onValueChange={setTvaRate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVatRates.map((r) => (
                      <SelectItem key={r.id} value={String(r.value)}>
                        {r.value}%{r.name ? ` — ${r.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={tva_rate}
                  onChange={(e) => setTvaRate(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="20"
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Mode de sélection</Label>
            <Select value={selection_type} onValueChange={handleSelectionTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selection_type === "limited" && (
            <div className="space-y-1">
              <Label>Nb max de sélections dans le groupe</Label>
              <Input
                value={max_selections}
                onChange={(e) => setMaxSelections(e.target.value)}
                type="number"
                min={1}
                className="max-w-[8rem]"
              />
            </div>
          )}

          {!isUnique && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch checked={allow_quantity} onCheckedChange={setAllowQuantity} id="opt-qty" />
                <Label htmlFor="opt-qty" className="cursor-pointer font-normal">
                  Quantité variable (compteur +/−)
                </Label>
              </div>
              {allow_quantity && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Quantité min</Label>
                    <Input
                      value={min_quantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      type="number"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantité max</Label>
                    <Input
                      value={max_quantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      type="number"
                      min={1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Ordre d&apos;affichage</Label>
            <Input
              value={display_order}
              onChange={(e) => setDisplayOrder(e.target.value)}
              type="number"
              className="max-w-[8rem]"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={is_visible} onCheckedChange={setIsVisible} id="opt-vis" />
              <Label htmlFor="opt-vis" className="cursor-pointer font-normal">
                Visible par le client
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_required} onCheckedChange={setIsRequired} id="opt-req" />
              <Label htmlFor="opt-req" className="cursor-pointer font-normal">
                Obligatoire
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_default} onCheckedChange={setIsDefault} id="opt-def" />
              <Label htmlFor="opt-def" className="cursor-pointer font-normal">
                Par défaut
              </Label>
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
                option_group: resolvedGroup,
                option_name: option_name.trim(),
                option_value: option_value.trim(),
                option_price: price,
                tva_rate: tva,
                selection_type,
                allow_quantity: isUnique ? false : allow_quantity,
                min_quantity: isUnique ? 1 : allow_quantity ? Number(min_quantity) : null,
                max_quantity: isUnique ? 1 : allow_quantity ? Number(max_quantity) : null,
                max_selections: selection_type === "limited" ? Number(max_selections) : null,
                display_order: ord,
                is_visible,
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
