"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { type CompositionStockRow } from "@/lib/queries/product-establishment-dashboard";
import { defaultProductStockInsert } from "@/lib/queries/stock-movement-queries";
import { createClient } from "@/lib/supabase/client";

import { ChangeStockUnitSection } from "./product-dashboard-change-unit";
import { StockMovementsSection } from "./product-dashboard-stock-movements";

const DEFAULT_STOCK_UNIT = "piece";

export function ProductSection({
  selfRow,
  productId,
  establishmentId,
  organizationId,
  invalidate,
  viaAchats = false,
  defaultUnit,
}: {
  selfRow: CompositionStockRow | undefined;
  productId: string;
  establishmentId: string;
  organizationId: string;
  invalidate: () => void;
  /** true pour un ingrédient : la fiche stock + l'unité sont créées à la 1ère réception (onglet Achats). */
  viaAchats?: boolean;
  defaultUnit?: string | null;
}) {
  const [initUnit, setInitUnit] = useState(defaultUnit ?? DEFAULT_STOCK_UNIT);

  const initMutation = useMutation({
    mutationFn: async (unit: string) => {
      const supabase = createClient();
      let compId: string;
      if (selfRow) {
        compId = selfRow.composition.id;
      } else {
        const { data: existingSelf } = await supabase
          .from("product_compositions")
          .select("id")
          .eq("main_product_id", productId)
          .eq("component_product_id", productId)
          .eq("deleted", false)
          .maybeSingle();
        if (existingSelf) {
          compId = existingSelf.id;
        } else {
          const { data: newComp, error: cErr } = await supabase
            .from("product_compositions")
            .insert({
              main_product_id: productId,
              component_product_id: productId,
              establishment_id: establishmentId,
              organization_id: organizationId,
              composition_kind: "recipe",
              default_quantity: 1,
              show_in_customization: false,
              is_required: false,
              deleted: false,
            })
            .select("id")
            .single();
          if (cErr) throw cErr;
          compId = newComp.id;
        }
      }

      // Fiche stock : on VÉRIFIE en base (pas l'état client) → update si elle existe, insert sinon.
      // Évite le doublon (violation d'unicité sur product_composition_id) quand une fiche a déjà
      // été créée (ex. par un ajout de prix via ensureSelfStock) mais pas encore reflétée côté client.
      const { data: existingStock } = await supabase
        .from("product_stocks")
        .select("id")
        .eq("product_composition_id", compId)
        .eq("establishment_id", establishmentId)
        .maybeSingle();
      if (existingStock) {
        const { error } = await supabase
          .from("product_stocks")
          .update({ unit, inventory_tracked: true })
          .eq("id", existingStock.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_stocks").insert({
          ...defaultProductStockInsert(compId, establishmentId, organizationId),
          current_stock: 0,
          unit,
          inventory_tracked: true,
        });
        if (error) throw error;
      }
      // Ingrédient : l'unité de gestion est aussi l'unité de portion → miroir sur products.portion_unit.
      if (viaAchats) {
        const { error: pErr } = await supabase.from("products").update({ portion_unit: unit }).eq("id", productId);
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => {
      toast.success("Stock configuré.");
      invalidate();
    },
    onError: (e: unknown) => {
      // Remonter le message DB réel (les erreurs Supabase ne sont pas des instances d'Error).
      const detail =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown; code?: unknown }).message) +
            ("code" in e ? ` (${String((e as { code?: unknown }).code)})` : "")
          : "Erreur lors de la configuration.";
      toast.error(detail);
    },
  });

  const lineStock = selfRow?.lineStock ?? null;

  if (lineStock) {
    return (
      <>
        <StockMovementsSection
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId}
          productStockId={lineStock.id}
          currentStock={lineStock.current_stock ?? 0}
          unit={lineStock.unit ?? null}
        />
        <ChangeStockUnitSection
          productId={productId}
          organizationId={organizationId}
          establishmentId={establishmentId}
          stockId={lineStock.id}
          currentUnit={lineStock.unit ?? DEFAULT_STOCK_UNIT}
          currentQty={lineStock.current_stock ?? 0}
        />
      </>
    );
  }

  // Pas encore de fiche stock : on permet de définir l'unité directement.
  // - Recette (produit fini) : on choisit l'unité de comptage.
  // - Ingrédient : l'unité se fige normalement à la 1ère réception, mais on peut la fixer ici
  //   (ex. un prix d'achat a été saisi sans réception → pas d'unité définie).
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {viaAchats ? "Définir l'unité de gestion" : "Configurer le suivi de stock"}
        </CardTitle>
        <CardDescription>
          {viaAchats
            ? "L'unité se fige normalement à la première réception — mais vous pouvez la définir ici sans passer par un prix d'achat."
            : "Choisissez l'unité de comptage du produit fini."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>{viaAchats ? "Unité de gestion" : "Unité de stock"}</Label>
            <Select value={initUnit} onValueChange={setInitUnit}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTION_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u === "piece" ? "pièce" : u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={initMutation.isPending} onClick={() => initMutation.mutate(initUnit)}>
            {initMutation.isPending ? "Configuration…" : viaAchats ? "Définir l'unité" : "Configurer le stock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
