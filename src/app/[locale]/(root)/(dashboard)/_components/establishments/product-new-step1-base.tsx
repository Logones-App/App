"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type VatRate = { id: string; name: string | null; value: number | null };
type Printer = { id: string; name: string | null };

type Draft = {
  name: string;
  description: string;
  vat_rate_id: string;
  printer_id: string;
  is_available: boolean;
};

type Props = {
  draft: Draft;
  patch: (k: keyof Draft, v: string | boolean) => void;
  namePlaceholder?: string;
  vatRates: VatRate[];
  printers: Printer[];
};

export function Step1FormFields({ draft, patch, namePlaceholder, vatRates, printers }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Infos de base</CardTitle>
        <CardDescription>Les champs * sont obligatoires.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s1-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s1-name"
              autoFocus
              value={draft.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder={namePlaceholder ?? "Nom du produit"}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s1-desc">Description</Label>
            <Textarea
              id="s1-desc"
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s1-vat">
              TVA <span className="text-destructive">*</span>
            </Label>
            <Select value={draft.vat_rate_id || undefined} onValueChange={(v) => patch("vat_rate_id", v)}>
              <SelectTrigger id="s1-vat">
                <SelectValue placeholder="Sélectionner un taux…" />
              </SelectTrigger>
              <SelectContent>
                {vatRates.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name ?? `${v.value ?? 0} %`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vatRates.length === 0 && (
              <p className="text-muted-foreground text-xs">Aucun taux configuré pour cet établissement.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="s1-printer">Imprimante</Label>
            <Select value={draft.printer_id} onValueChange={(v) => patch("printer_id", v)}>
              <SelectTrigger id="s1-printer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Défaut</SelectItem>
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <Label htmlFor="s1-avail">Disponible</Label>
            <Switch id="s1-avail" checked={draft.is_available} onCheckedChange={(v) => patch("is_available", v)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
