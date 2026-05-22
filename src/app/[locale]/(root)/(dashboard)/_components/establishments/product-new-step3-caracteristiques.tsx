"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AllergenPicker, LabelPicker, PortionInput } from "@/components/ui/product-attribute-pickers";

import type { WizardData } from "./product-new-wizard";

export function Step3Caracteristiques({
  data,
  patch,
}: {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Caractéristiques</CardTitle>
        <CardDescription>SKU, portion, food cost, allergènes et labels. Tous optionnels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Référence interne (SKU)</Label>
            <Input value={data.sku} onChange={(e) => patch({ sku: e.target.value })} placeholder="EX-001" />
          </div>

          <div className="space-y-2">
            <Label>
              Prix d&apos;achat HT{" "}
              <span className="text-muted-foreground text-xs font-normal">(si aucun fournisseur avec prix)</span>
            </Label>
            <div className="relative">
              <Input
                value={data.purchase_price}
                onChange={(e) => patch({ purchase_price: e.target.value })}
                inputMode="decimal"
                placeholder="0,00"
                className="pr-8 tabular-nums"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Poids / volume portion</Label>
            <PortionInput
              weight={data.portion_weight}
              unit={data.portion_unit}
              onWeightChange={(v) => patch({ portion_weight: v })}
              onUnitChange={(v) => patch({ portion_unit: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Food cost cible <span className="text-muted-foreground text-xs font-normal">(ratio coût/vente)</span>
            </Label>
            <div className="relative">
              <Input
                value={data.food_cost_target}
                onChange={(e) => patch({ food_cost_target: e.target.value })}
                inputMode="decimal"
                placeholder="30"
                className="pr-8 tabular-nums"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Allergènes <span className="text-muted-foreground text-xs font-normal">(actifs en rouge)</span>
          </Label>
          <AllergenPicker value={data.allergens} onChange={(v) => patch({ allergens: v })} />
        </div>

        <div className="space-y-2">
          <Label>Labels</Label>
          <LabelPicker value={data.labels} onChange={(v) => patch({ labels: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
