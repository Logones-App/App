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
import type { ProductCompositionRow } from "@/lib/queries/product-establishment-dashboard";
import type { Tables } from "@/lib/supabase/database.types";

function parseLocaleDecimal(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function formatNumericForInput(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "";
}

export function ProductCompositionEditDialog({
  open,
  onOpenChange,
  row,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: ProductCompositionRow | null;
  onSave: (patch: Partial<Tables<"product_compositions">>) => void;
  pending: boolean;
}) {
  const [composition_kind, setCompositionKind] = useState("recipe");
  const [default_quantity, setDefaultQuantity] = useState("1");
  const [max_quantity, setMaxQuantity] = useState("");
  const [display_order, setDisplayOrder] = useState("0");
  const [unit_supplement_price, setUnitSupplementPrice] = useState("");
  const [price_multiplier, setPriceMultiplier] = useState("");
  const [show_in_customization, setShowInCustomization] = useState(false);
  const [is_required, setIsRequired] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setCompositionKind(row.composition_kind);
    setDefaultQuantity(formatNumericForInput(row.default_quantity ?? 1) || "1");
    setMaxQuantity(formatNumericForInput(row.max_quantity));
    setDisplayOrder(formatNumericForInput(row.display_order ?? 0) || "0");
    setUnitSupplementPrice(formatNumericForInput(row.unit_supplement_price));
    setPriceMultiplier(formatNumericForInput(row.price_multiplier));
    setShowInCustomization(row.show_in_customization);
    setIsRequired(Boolean(row.is_required));
  }, [open, row]);

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la composition</DialogTitle>
          <DialogDescription>
            {row.component?.name ?? "Composant"} — type et quantités (pas de changement de composant ici).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={composition_kind} onValueChange={setCompositionKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recipe">recipe</SelectItem>
                <SelectItem value="modifier">modifier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Qté défaut</Label>
              <Input value={default_quantity} onChange={(e) => setDefaultQuantity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Qté max</Label>
              <Input value={max_quantity} onChange={(e) => setMaxQuantity(e.target.value)} placeholder="vide" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Ordre</Label>
            <Input
              value={display_order}
              onChange={(e) => setDisplayOrder(e.target.value)}
              type="text"
              inputMode="numeric"
              placeholder="0"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Supplément unitaire et multiplicateur de prix s&apos;excluent : un seul des deux peut être renseigné (sinon
            le supplément est conservé à l&apos;enregistrement).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Supplément unitaire</Label>
              <Input
                value={unit_supplement_price}
                onChange={(e) => setUnitSupplementPrice(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label>Multiplicateur prix</Label>
              <Input
                value={price_multiplier}
                onChange={(e) => setPriceMultiplier(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={show_in_customization} onCheckedChange={setShowInCustomization} id="cmp-mod" />
              <Label htmlFor="cmp-mod">Modale perso</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_required} onCheckedChange={setIsRequired} id="cmp-req" />
              <Label htmlFor="cmp-req">Requis</Label>
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
              const dq = parseLocaleDecimal(String(default_quantity));
              if (dq === null || Number.isNaN(dq)) {
                toast.error("Qté défaut invalide.");
                return;
              }
              const ordParsed = parseLocaleDecimal(String(display_order));
              if (ordParsed === null || Number.isNaN(ordParsed)) {
                toast.error("Ordre invalide.");
                return;
              }
              const ord = Math.max(0, Math.trunc(ordParsed));
              const maxQ = max_quantity.trim() === "" ? null : parseLocaleDecimal(max_quantity);
              if (maxQ !== null && Number.isNaN(maxQ)) {
                toast.error("Qté max invalide.");
                return;
              }
              const uspRaw = unit_supplement_price.trim() === "" ? null : parseLocaleDecimal(unit_supplement_price);
              if (uspRaw !== null && Number.isNaN(uspRaw)) {
                toast.error("Supplément unitaire invalide.");
                return;
              }
              const usp = uspRaw === null ? null : Math.round(uspRaw * 100) / 100;
              const pmRaw = price_multiplier.trim() === "" ? null : parseLocaleDecimal(price_multiplier);
              if (pmRaw !== null && Number.isNaN(pmRaw)) {
                toast.error("Multiplicateur invalide.");
                return;
              }
              const pm = pmRaw === null ? null : Math.round(pmRaw * 10000) / 10000;
              if (usp !== null && pm !== null) {
                toast.message(
                  "Supplément et multiplicateur ne peuvent pas coexister : le multiplicateur sera effacé à l'enregistrement.",
                  { duration: 4500 },
                );
              }
              onSave({
                composition_kind,
                default_quantity: dq,
                max_quantity: maxQ,
                display_order: ord,
                unit_supplement_price: usp,
                price_multiplier: pm,
                show_in_customization,
                is_required,
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

export function ProductCompositionAddDialog({
  open,
  onOpenChange,
  candidateComponents,
  defaultDisplayOrder,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidateComponents: Tables<"products">[];
  defaultDisplayOrder: number;
  onSave: (row: Partial<Tables<"product_compositions">>) => void;
  pending: boolean;
}) {
  const [component_product_id, setComponentProductId] = useState("");
  const [composition_kind, setCompositionKind] = useState("recipe");
  const [default_quantity, setDefaultQuantity] = useState("1");
  const [max_quantity, setMaxQuantity] = useState("");
  const [display_order, setDisplayOrder] = useState(String(defaultDisplayOrder));
  const [unit_supplement_price, setUnitSupplementPrice] = useState("");
  const [price_multiplier, setPriceMultiplier] = useState("");
  const [show_in_customization, setShowInCustomization] = useState(false);
  const [is_required, setIsRequired] = useState(false);

  useEffect(() => {
    if (!open) return;
    setComponentProductId("");
    setCompositionKind("recipe");
    setDefaultQuantity("1");
    setMaxQuantity("");
    setDisplayOrder(String(defaultDisplayOrder));
    setUnitSupplementPrice("");
    setPriceMultiplier("");
    setShowInCustomization(false);
    setIsRequired(false);
  }, [open, defaultDisplayOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle ligne de composition</DialogTitle>
          <DialogDescription>Choisissez le produit composant et le type de ligne.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Produit composant</Label>
            <Select value={component_product_id || undefined} onValueChange={setComponentProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un produit…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {candidateComponents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={composition_kind} onValueChange={setCompositionKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recipe">recipe</SelectItem>
                <SelectItem value="modifier">modifier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Qté défaut</Label>
              <Input
                value={default_quantity}
                onChange={(e) => setDefaultQuantity(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label>Qté max</Label>
              <Input
                value={max_quantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="vide"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Ordre</Label>
            <Input
              value={display_order}
              onChange={(e) => setDisplayOrder(e.target.value)}
              type="text"
              inputMode="numeric"
              placeholder="0"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Supplément unitaire et multiplicateur de prix s&apos;excluent : un seul des deux peut être renseigné (sinon
            le supplément est conservé à l&apos;enregistrement).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Supplément unitaire</Label>
              <Input
                value={unit_supplement_price}
                onChange={(e) => setUnitSupplementPrice(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label>Multiplicateur prix</Label>
              <Input
                value={price_multiplier}
                onChange={(e) => setPriceMultiplier(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={show_in_customization} onCheckedChange={setShowInCustomization} id="add-mod" />
              <Label htmlFor="add-mod">Modale perso</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={is_required} onCheckedChange={setIsRequired} id="add-req" />
              <Label htmlFor="add-req">Requis</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={pending || !component_product_id}
            onClick={() => {
              const dq = parseLocaleDecimal(String(default_quantity));
              if (dq === null || Number.isNaN(dq)) {
                toast.error("Qté défaut invalide.");
                return;
              }
              const ordParsed = parseLocaleDecimal(String(display_order));
              if (ordParsed === null || Number.isNaN(ordParsed)) {
                toast.error("Ordre invalide.");
                return;
              }
              const ord = Math.max(0, Math.trunc(ordParsed));
              const maxQ = max_quantity.trim() === "" ? null : parseLocaleDecimal(max_quantity);
              if (maxQ !== null && Number.isNaN(maxQ)) {
                toast.error("Qté max invalide.");
                return;
              }
              const uspRaw = unit_supplement_price.trim() === "" ? null : parseLocaleDecimal(unit_supplement_price);
              if (uspRaw !== null && Number.isNaN(uspRaw)) {
                toast.error("Supplément unitaire invalide.");
                return;
              }
              const usp = uspRaw === null ? null : Math.round(uspRaw * 100) / 100;
              const pmRaw = price_multiplier.trim() === "" ? null : parseLocaleDecimal(price_multiplier);
              if (pmRaw !== null && Number.isNaN(pmRaw)) {
                toast.error("Multiplicateur invalide.");
                return;
              }
              const pm = pmRaw === null ? null : Math.round(pmRaw * 10000) / 10000;
              if (usp !== null && pm !== null) {
                toast.message(
                  "Supplément et multiplicateur ne peuvent pas coexister : le multiplicateur sera effacé à l'enregistrement.",
                  { duration: 4500 },
                );
              }
              onSave({
                component_product_id,
                composition_kind,
                default_quantity: dq,
                max_quantity: maxQ,
                display_order: ord,
                unit_supplement_price: usp,
                price_multiplier: pm,
                show_in_customization: composition_kind === "modifier" ? true : show_in_customization,
                is_required,
              });
            }}
          >
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
