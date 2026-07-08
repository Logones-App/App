"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AllergenPicker, LabelBadges, LabelPicker } from "@/components/ui/product-attribute-pickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AllergenKey, LabelKey } from "@/lib/constants/product-attributes";

import { OriginPicker } from "./product-origin-picker";

/** Champs de base « Propriété + Caractéristiques » (une seule carte) — partagés fiche (edit) et wizard (create). */
export type ProductBaseDraft = {
  name: string;
  description: string;
  is_available: boolean;
  printer_id: string; // "__none__" ou id
  vat_rate_id: string;
  sku: string;
  food_cost_target: string; // pourcentage saisi (ex. "30")
};

type VatRate = { id: string; name?: string | null; value?: number | null };
type Printer = { id: string; name?: string | null };

export function ProductBaseFields({
  draft,
  patch,
  allergens,
  setAllergens,
  labels,
  setLabels,
  origins,
  setOrigins,
  vatRates,
  printers,
  namePlaceholder,
  headerRight,
  orphanPrinterId = null,
  orphanVatId = null,
}: {
  draft: ProductBaseDraft;
  patch: (k: keyof ProductBaseDraft, v: string | boolean) => void;
  allergens: AllergenKey[];
  setAllergens: (v: AllergenKey[]) => void;
  labels: LabelKey[];
  setLabels: (v: LabelKey[]) => void;
  origins: string[];
  setOrigins: (v: string[]) => void;
  vatRates: VatRate[];
  printers: Printer[];
  namePlaceholder?: string;
  /** Slot d'action dans l'en-tête (ex. bouton Archiver sur la fiche). */
  headerRight?: ReactNode;
  orphanPrinterId?: string | null;
  orphanVatId?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Fiche produit</CardTitle>
          <CardDescription>Informations catalogue (niveau organisation)</CardDescription>
        </div>
        {headerRight}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identité */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder={namePlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>Référence interne (SKU)</Label>
            <Input value={draft.sku} onChange={(e) => patch("sku", e.target.value)} placeholder="EX-001" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={draft.description} onChange={(e) => patch("description", e.target.value)} rows={3} />
          </div>

          {/* Caisse / compta */}
          <div className="space-y-2">
            <Label>
              TVA <span className="text-destructive">*</span>
            </Label>
            <Select value={draft.vat_rate_id || undefined} onValueChange={(v) => patch("vat_rate_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un taux…" />
              </SelectTrigger>
              <SelectContent>
                {orphanVatId ? (
                  <SelectItem value={orphanVatId}>Référence actuelle (liste indisponible)</SelectItem>
                ) : null}
                {vatRates.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name ?? `${v.value ?? 0} %`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Imprimante</Label>
            <Select value={draft.printer_id || undefined} onValueChange={(v) => patch("printer_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Défaut</SelectItem>
                {orphanPrinterId ? (
                  <SelectItem value={orphanPrinterId}>Référence actuelle (liste indisponible)</SelectItem>
                ) : null}
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disponibilité / coût */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <Label>Disponible</Label>
            <Switch checked={draft.is_available} onCheckedChange={(v) => patch("is_available", v)} />
          </div>
          <div className="space-y-2">
            <Label>
              Food cost cible <span className="text-muted-foreground text-xs font-normal">(ratio coût/vente)</span>
            </Label>
            <div className="relative">
              <Input
                value={draft.food_cost_target}
                onChange={(e) => patch("food_cost_target", e.target.value)}
                inputMode="decimal"
                placeholder="30"
                className="pr-8 tabular-nums"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Réglementaire / marketing */}
        <div className="space-y-2">
          <Label>
            Allergènes <span className="text-muted-foreground text-xs font-normal">(actifs en rouge)</span>
          </Label>
          <AllergenPicker value={allergens} onChange={setAllergens} />
        </div>

        <div className="space-y-2">
          <Label>
            Origine <span className="text-muted-foreground text-xs font-normal">(pays de production)</span>
          </Label>
          <OriginPicker value={origins} onChange={setOrigins} />
        </div>

        <div className="space-y-2">
          <Label>Labels</Label>
          <LabelPicker value={labels} onChange={setLabels} />
          {labels.length > 0 && (
            <div className="mt-2">
              <LabelBadges labels={labels} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
