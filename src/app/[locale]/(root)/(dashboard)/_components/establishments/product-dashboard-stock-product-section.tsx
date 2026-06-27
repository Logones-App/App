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

      if (!selfRow?.lineStock) {
        const { error } = await supabase.from("product_stocks").insert({
          ...defaultProductStockInsert(compId, establishmentId, organizationId),
          current_stock: 0,
          unit,
          inventory_tracked: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Stock configuré.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la configuration."),
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

  // Ingrédient : la fiche stock et l'unité de gestion naissent à la première réception.
  if (viaAchats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suivi de stock</CardTitle>
          <CardDescription>
            L&apos;unité de gestion et le stock seront créés à la <strong>première réception</strong> (onglet Achats).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Produit fini (recette) : pas de réception → on configure l'unité ici.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurer le suivi de stock</CardTitle>
        <CardDescription>Choisissez l&apos;unité de comptage du produit fini.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Unité de stock</Label>
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
            {initMutation.isPending ? "Configuration…" : "Configurer le stock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
