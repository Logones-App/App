"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureSelfStock } from "@/lib/queries/reception-queries";
import { useProductionHistory, useSelfProductStocks, type SelfStock } from "@/lib/queries/recipe-cost-queries";
import { collectReachable, flattenLeaves, type RecipeCostCtx } from "@/lib/recipe-cost";
import { createClient } from "@/lib/supabase/client";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Prep = {
  id: string;
  name: string;
  yield_quantity: number | null;
  yield_unit: string | null;
  portion_unit: string | null;
};

/**
 * Écrit un événement de production : N mouvements de consommation (matières, quantité < 0) PUIS,
 * en DERNIER (instruction séparée), le mouvement de sortie (préparation, quantité > 0). Tous liés
 * par le même `reference_id`. Le trigger FIFO valorise (coût du lot = Σ conso / produit).
 */
async function fabricateBatch(
  supabase: ReturnType<typeof createClient>,
  args: {
    prep: Prep;
    prepStock: SelfStock;
    producedQty: number;
    leaves: Map<string, number>;
    stocks: Map<string, SelfStock>;
    establishmentId: string;
    organizationId: string;
  },
) {
  const eventId = crypto.randomUUID();
  const base = {
    movement_type: "production" as const,
    reference_id: eventId,
    reference_type: "production",
    recipe_product_id: args.prep.id,
    establishment_id: args.establishmentId,
    organization_id: args.organizationId,
    unit_cost: null,
    deleted: false,
  };

  // 1. Consommations (matières) — insérées AVANT la sortie.
  for (const [leafId, qty] of args.leaves) {
    const st = args.stocks.get(leafId);
    if (!st || !st.inventory_tracked) continue; // feuille non suivie = infinie → pas de décrément
    const q = r3(qty);
    const before = st.current_stock;
    const after = r3(before - q);
    const consumeMove = {
      ...base,
      product_id: leafId,
      product_stock_id: st.id,
      quantity: -q,
      quantity_before: before,
      quantity_after: after,
      unit: st.unit,
    };
    const { error } = await supabase.from("stock_movements").insert(consumeMove);
    if (error) throw error;
    const { error: uErr } = await supabase.from("product_stocks").update({ current_stock: after }).eq("id", st.id);
    if (uErr) throw uErr;
  }

  // 2. Sortie (préparation) — EN DERNIER (le trigger somme les consommations du même reference_id).
  const q = r3(args.producedQty);
  const before = args.prepStock.current_stock;
  const after = r3(before + q);
  const outMove = {
    ...base,
    product_id: args.prep.id,
    product_stock_id: args.prepStock.id,
    quantity: q,
    quantity_before: before,
    quantity_after: after,
    unit: args.prepStock.unit,
  };
  const { error } = await supabase.from("stock_movements").insert(outMove);
  if (error) throw error;
  const { error: uErr } = await supabase
    .from("product_stocks")
    .update({ current_stock: after })
    .eq("id", args.prepStock.id);
  if (uErr) throw uErr;
}

function useInvalidateProduction(productId: string, establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["self-product-stocks"] });
    void queryClient.invalidateQueries({ queryKey: ["production-history"] });
    void queryClient.invalidateQueries({
      queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["product-establishment-dashboard", productId, establishmentId, organizationId],
    });
  };
}

function ActivateCard({
  prep,
  yieldUnit,
  establishmentId,
  organizationId,
}: {
  prep: Prep;
  yieldUnit: string;
  establishmentId: string;
  organizationId: string;
}) {
  const invalidate = useInvalidateProduction(prep.id, establishmentId, organizationId);
  const mutation = useMutation({
    mutationFn: () =>
      ensureSelfStock(createClient(), { productId: prep.id, establishmentId, organizationId, desiredUnit: yieldUnit }),
    onSuccess: () => {
      toast.success("Stock de préparation activé.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur."),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fabrication en lot</CardTitle>
        <CardDescription>
          Activez le stock de cette préparation (en {yieldUnit === "piece" ? "pièces" : yieldUnit}) pour la fabriquer à
          l&apos;avance : la production consomme les matières et alimente ce stock.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Activation…" : "Activer la fabrication en lot"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FabricateForm({
  prep,
  prepStock,
  costCtx,
  stocks,
  hasStock,
  nameById,
  establishmentId,
  organizationId,
}: {
  prep: Prep;
  prepStock: SelfStock;
  costCtx: RecipeCostCtx;
  stocks: Map<string, SelfStock>;
  hasStock: Set<string>;
  nameById: Map<string, string>;
  establishmentId: string;
  organizationId: string;
}) {
  const invalidate = useInvalidateProduction(prep.id, establishmentId, organizationId);
  const yieldQty = prep.yield_quantity as number;
  const yieldUnit = prepStock.unit ?? prep.yield_unit ?? "";
  const unitLabel = yieldUnit === "piece" ? "pièce" : yieldUnit;
  const [qtyStr, setQtyStr] = useState(String(yieldQty));

  const produced = parsePositive(qtyStr);
  const leaves =
    produced != null
      ? flattenLeaves(prep.id, costCtx, produced / yieldQty, hasStock, new Set<string>(), new Map<string, number>())
      : new Map<string, number>();
  const rows = [...leaves].map(([id, qty]) => {
    const st = stocks.get(id);
    const need = r3(qty);
    const tracked = st?.inventory_tracked ?? false;
    return {
      id,
      name: nameById.get(id) ?? "—",
      need,
      unit: st?.unit ?? "",
      current: st?.current_stock ?? null,
      tracked,
      short: tracked && st != null && st.current_stock < need,
    };
  });

  const mutation = useMutation({
    mutationFn: () =>
      fabricateBatch(createClient(), {
        prep,
        prepStock,
        producedQty: produced as number,
        leaves,
        stocks,
        establishmentId,
        organizationId,
      }),
    onSuccess: () => {
      toast.success("Lot fabriqué.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la fabrication."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fabrication en lot</CardTitle>
        <CardDescription>
          Stock actuel :{" "}
          <strong>
            {prepStock.current_stock} {yieldUnit === "piece" ? "pièce" : yieldUnit}
          </strong>
          . Fabriquer consomme les matières et alimente ce stock (coût du lot calculé automatiquement).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <span className="text-muted-foreground pb-2 text-sm">Fabriquer</span>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Quantité produite</Label>
            <Input
              value={qtyStr}
              onChange={(e) => setQtyStr(e.target.value)}
              inputMode="decimal"
              className="tabular-nums"
            />
          </div>
          <span className="text-muted-foreground pb-2 text-sm">{yieldUnit === "piece" ? "pièce(s)" : yieldUnit}</span>
        </div>

        {rows.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">Matières consommées</p>
            {rows.map((row) => (
              <p key={row.id} className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
                <span className="text-foreground">{row.name}</span> −{row.need} {row.unit}
                {row.current != null && <span className="opacity-70">· stock : {row.current}</span>}
                {row.short && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> insuffisant
                  </span>
                )}
              </p>
            ))}
          </div>
        )}

        <Button type="button" disabled={produced == null || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Fabrication…" : "Fabriquer le lot"}
        </Button>

        <ProductionHistory prepStockId={prepStock.id} establishmentId={establishmentId} unitLabel={unitLabel} />
      </CardContent>
    </Card>
  );
}

function ProductionHistory({
  prepStockId,
  establishmentId,
  unitLabel,
}: {
  prepStockId: string;
  establishmentId: string;
  unitLabel: string;
}) {
  const { data: history = [] } = useProductionHistory(prepStockId, establishmentId);
  if (history.length === 0) return null;
  return (
    <div className="space-y-1 border-t pt-3">
      <p className="text-muted-foreground text-xs font-medium">Derniers lots fabriqués</p>
      {history.map((h) => (
        <p key={h.id} className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
          <span>{h.created_at ? format(parseISO(h.created_at), "d MMM yyyy HH:mm", { locale: fr }) : "—"}</span>
          <span className="text-foreground">
            +{h.quantity} {unitLabel}
          </span>
          {h.unit_cost != null && (
            <span>
              · {eur.format(h.unit_cost)}/{unitLabel}
            </span>
          )}
          {h.needs_review && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <AlertTriangle className="h-3 w-3" /> à vérifier
            </span>
          )}
        </p>
      ))}
    </div>
  );
}

/** Carte « Fabrication en lot » d'une préparation (recette avec rendement). P0 (activer stock) + P3 (fabriquer). */
export function RecipeProductionCard({
  prep,
  costCtx,
  nameById,
  establishmentId,
  organizationId,
}: {
  prep: Prep;
  costCtx: RecipeCostCtx;
  nameById: Map<string, string>;
  establishmentId: string;
  organizationId: string;
}) {
  const reachable = [...collectReachable(prep.id, costCtx.byMain)];
  const { data: selfStocks } = useSelfProductStocks([prep.id, ...reachable], establishmentId);
  const stocks = selfStocks ?? new Map<string, SelfStock>();
  const hasStock = new Set([...stocks].filter(([, s]) => s.inventory_tracked).map(([id]) => id));
  const prepStock = stocks.get(prep.id) ?? null;
  const yieldUnit = prep.yield_unit ?? prep.portion_unit ?? "";

  if (prep.yield_quantity == null || prep.yield_quantity <= 0) return null; // pas de rendement → pas de fabrication

  if (!prepStock) {
    return (
      <ActivateCard
        prep={prep}
        yieldUnit={yieldUnit}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
    );
  }
  return (
    <FabricateForm
      prep={prep}
      prepStock={prepStock}
      costCtx={costCtx}
      stocks={stocks}
      hasStock={hasStock}
      nameById={nameById}
      establishmentId={establishmentId}
      organizationId={organizationId}
    />
  );
}
