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
}: {
  selfRow: CompositionStockRow | undefined;
  productId: string;
  establishmentId: string;
  organizationId: string;
  invalidate: () => void;
}) {
  const [initUnit, setInitUnit] = useState(DEFAULT_STOCK_UNIT);

  const initMutation = useMutation({
    mutationFn: async (unit: string) => {
      const supabase = createClient();

      let compId: string;
      if (!selfRow) {
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
      } else {
        compId = selfRow.composition.id;
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
      toast.success("Unité configurée. Faites une réception dans l'onglet Achats pour approvisionner le stock.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la configuration."),
  });

  const lineStock = selfRow?.lineStock ?? null;
  const currentStock = lineStock?.current_stock ?? 0;
  const stockUnit = lineStock?.unit ?? null;

  if (!lineStock) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurer le suivi de stock</CardTitle>
          <CardDescription>
            Choisissez l&apos;unité de mesure. Les réceptions se font ensuite dans l&apos;onglet Achats.
          </CardDescription>
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

  return (
    <>
      <StockMovementsSection
        productId={productId}
        organizationId={organizationId}
        establishmentId={establishmentId}
        productStockId={lineStock.id}
        currentStock={currentStock}
        unit={stockUnit}
      />
      <ChangeStockUnitSection
        productId={productId}
        organizationId={organizationId}
        establishmentId={establishmentId}
        stockId={lineStock.id}
        currentUnit={stockUnit ?? DEFAULT_STOCK_UNIT}
        currentQty={currentStock}
      />
    </>
  );
}
