"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { type CompositionStockRow } from "@/lib/queries/product-establishment-dashboard";
import { defaultProductStockInsert, insertInitialMovement } from "@/lib/queries/stock-movement-queries";
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
  const [initQty, setInitQty] = useState("0");
  const [initUnit, setInitUnit] = useState(DEFAULT_STOCK_UNIT);

  const initMutation = useMutation({
    mutationFn: async ({ qty, unit }: { qty: number; unit: string }) => {
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

      if (selfRow?.lineStock) {
        await insertInitialMovement(productId, organizationId, establishmentId, selfRow.lineStock.id, qty, unit);
      } else {
        const { data: st, error } = await supabase
          .from("product_stocks")
          .insert({
            ...defaultProductStockInsert(compId, establishmentId, organizationId),
            current_stock: qty,
            unit,
            inventory_tracked: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        await insertInitialMovement(productId, organizationId, establishmentId, st.id, qty, unit);
      }
    },
    onSuccess: () => {
      toast.success("Stock initialisé.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'initialisation."),
  });

  const lineStock = selfRow?.lineStock ?? null;
  const currentStock = lineStock?.current_stock ?? 0;
  const stockUnit = lineStock?.unit ?? null;

  if (!lineStock) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Initialiser le stock</CardTitle>
          <CardDescription>Définissez la quantité initiale de produits finis en stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Quantité initiale</Label>
              <Input
                value={initQty}
                onChange={(e) => setInitQty(e.target.value)}
                inputMode="decimal"
                className="w-24 tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
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
            <Button
              disabled={initMutation.isPending}
              onClick={() => {
                const qty = parseFloat(initQty.replace(",", "."));
                if (!Number.isFinite(qty) || qty < 0) {
                  toast.error("Quantité invalide.");
                  return;
                }
                initMutation.mutate({ qty, unit: initUnit });
              }}
            >
              {initMutation.isPending ? "Initialisation…" : "Initialiser le stock"}
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
