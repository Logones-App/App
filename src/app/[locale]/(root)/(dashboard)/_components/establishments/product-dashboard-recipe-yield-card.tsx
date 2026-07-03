"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { PRODUCT_DASHBOARD_QUERY_KEY } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Rendement d'une recette-préparation : « cette recette produit X [unité] ».
 * Sert à répartir proportionnellement les ingrédients quand la recette est
 * consommée dans une autre (ex. 250 g d'une pâte dont le lot fait 5 kg).
 */
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function RecipeYieldCard({
  productId,
  establishmentId,
  organizationId,
  yieldQuantity,
  yieldUnit,
  portionUnit,
  recipeCostHT = null,
}: {
  productId: string;
  establishmentId: string;
  organizationId: string;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  portionUnit: string | null;
  /** Coût matière HT du BOM (= coût du lot pour ce rendement). Pour le coût par unité produite. */
  recipeCostHT?: number | null;
}) {
  const t = useTranslations("units");
  const queryClient = useQueryClient();
  const [qtyStr, setQtyStr] = useState(yieldQuantity != null ? String(yieldQuantity) : "");
  const [unit, setUnit] = useState(yieldUnit ?? portionUnit ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parsePositive(qtyStr);
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ yield_quantity: qty, yield_unit: qty != null ? unit || null : null })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendement enregistré.");
      void queryClient.invalidateQueries({
        queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });

  const dirty =
    qtyStr !== (yieldQuantity != null ? String(yieldQuantity) : "") || unit !== (yieldUnit ?? portionUnit ?? "");

  // Coût par unité produite = coût du lot ÷ rendement (utilise le rendement ENREGISTRÉ, pas le brouillon).
  const costPerUnit =
    yieldQuantity != null && yieldQuantity > 0 && recipeCostHT != null && recipeCostHT > 0
      ? recipeCostHT / yieldQuantity
      : null;
  const savedUnitLabel = yieldUnit ?? portionUnit ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rendement de la recette</CardTitle>
        <CardDescription>
          Quantité produite par cette fiche telle qu&apos;elle est saisie. Sert à répartir les ingrédients quand la
          recette est utilisée dans une autre (ex. « 250 g » d&apos;une pâte dont le lot fait 5 kg) et à calculer le
          coût par portion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-2">
          <span className="text-muted-foreground pb-2 text-sm">Cette recette produit</span>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Quantité</Label>
            <Input
              value={qtyStr}
              onChange={(e) => setQtyStr(e.target.value)}
              inputMode="decimal"
              placeholder="ex : 5"
              className="tabular-nums"
            />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Unité</Label>
            <Select value={unit || undefined} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="— Unité" />
              </SelectTrigger>
              <SelectContent>
                {PORTION_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="sm"
            className="mb-0.5"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "…" : "Enregistrer"}
          </Button>
        </div>
        {costPerUnit != null && (
          <p className="text-muted-foreground mt-3 text-xs">
            Coût matière du lot ≈ <strong>{eur.format(recipeCostHT as number)}</strong> → ≈{" "}
            <strong>
              {eur.format(costPerUnit)}/{savedUnitLabel === "piece" ? "pièce" : savedUnitLabel}
            </strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
