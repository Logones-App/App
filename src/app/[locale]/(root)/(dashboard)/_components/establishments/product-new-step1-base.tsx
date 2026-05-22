"use client";

import { useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductTypePicker } from "@/components/ui/product-attribute-pickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEstablishmentPrinters, useEstablishmentVatRates } from "@/lib/queries/establishments";

import type { WizardData } from "./product-new-wizard";

export function Step1BaseInfo({
  data,
  patch,
  establishmentId,
  organizationId,
}: {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  establishmentId: string;
  organizationId: string;
}) {
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);

  useEffect(() => {
    const firstVatId = vatRates[0]?.id;
    if (firstVatId && !data.vat_rate_id) {
      patch({ vat_rate_id: firstVatId });
    }
  }, [vatRates, data.vat_rate_id, patch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Infos de base</CardTitle>
        <CardDescription>Nom, type, TVA et paramètres catalogue.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wizard-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wizard-name"
              autoFocus
              value={data.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Nom du produit"
            />
            {!data.name.trim() && <p className="text-destructive text-xs">Requis</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Type de produit <span className="text-muted-foreground text-xs font-normal">(plusieurs possibles)</span>
            </Label>
            <ProductTypePicker value={data.product_types} onChange={(v) => patch({ product_types: v })} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="wizard-description">Description</Label>
            <Textarea
              id="wizard-description"
              value={data.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-vat">
              TVA <span className="text-destructive">*</span>
            </Label>
            <Select value={data.vat_rate_id} onValueChange={(v) => patch({ vat_rate_id: v })}>
              <SelectTrigger id="wizard-vat">
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
            {!data.vat_rate_id && <p className="text-destructive text-xs">Requis</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-printer">Imprimante</Label>
            <Select value={data.printer_id} onValueChange={(v) => patch({ printer_id: v })}>
              <SelectTrigger id="wizard-printer">
                <SelectValue placeholder="Défaut" />
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
            <Label htmlFor="wizard-available">Disponible</Label>
            <Switch
              id="wizard-available"
              checked={data.is_available}
              onCheckedChange={(v) => patch({ is_available: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
