"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { stockMovementsQueryKey } from "./stock-movement-queries";

export type ReceptionRow = {
  id: string;
  created_at: string | null;
  quantity: number;
  quantity_before: number;
  unit: string | null;
  unit_cost: number | null;
  remaining_quantity: number | null;
  supplier_reference_id: string | null;
  supplier_reference: {
    order_unit: string | null;
    conversion_factor: number;
    supplier_product_name: string | null;
    supplier: { name: string } | null;
  } | null;
};

export function receptionsQueryKey(productId: string, establishmentId: string) {
  return ["product-receptions", productId, establishmentId] as const;
}

/** Historique des réceptions (mouvements purchase) avec fournisseur + référence joints. */
export function useProductReceptions(productId: string, establishmentId: string) {
  return useQuery({
    queryKey: receptionsQueryKey(productId, establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select(
          "id, created_at, quantity, quantity_before, unit, unit_cost, remaining_quantity, supplier_reference_id, supplier_reference:supplier_references(order_unit, conversion_factor, supplier_product_name, supplier:suppliers(name))",
        )
        .eq("product_id", productId)
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReceptionRow[];
    },
    enabled: !!productId && !!establishmentId,
  });
}

// Un lot est « intact » (non entamé par des ventes) si sa quantité restante == quantité reçue.
function isLotIntact(quantity: number, remainingQuantity: number | null): boolean {
  return remainingQuantity != null && Math.abs(remainingQuantity - quantity) < 0.001;
}

function receptionInvalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  organizationId: string,
  establishmentId: string,
) {
  void queryClient.invalidateQueries({ queryKey: receptionsQueryKey(productId, establishmentId) });
  void queryClient.invalidateQueries({
    queryKey: stockMovementsQueryKey(productId, organizationId, establishmentId),
  });
  void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
  void queryClient.invalidateQueries({
    queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
  });
}

/** Supprime une réception — uniquement si le lot est intact (sinon FIFO/audit corrompus). */
export function useDeleteReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movementId,
      productStockId,
      quantity,
      remainingQuantity,
    }: {
      movementId: string;
      productStockId: string;
      quantity: number;
      remainingQuantity: number | null;
    }) => {
      if (!isLotIntact(quantity, remainingQuantity)) {
        throw new Error("Réception déjà entamée par des ventes — corrigez via un ajustement de stock.");
      }
      const supabase = createClient();
      const { data: stock, error: readErr } = await supabase
        .from("product_stocks")
        .select("current_stock")
        .eq("id", productStockId)
        .single();
      if (readErr) throw readErr;

      const { error: delErr } = await supabase
        .from("stock_movements")
        .update({ deleted: true, remaining_quantity: 0 })
        .eq("id", movementId);
      if (delErr) throw delErr;

      const next = Math.round((stock.current_stock - quantity) * 1000) / 1000;
      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: next })
        .eq("id", productStockId);
      if (stockErr) throw stockErr;
    },
    onSuccess: () => {
      toast.success("Réception supprimée");
      receptionInvalidate(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression"),
  });
}

/** Édite une réception (qté + prix unitaire) — uniquement si le lot est intact. */
export function useUpdateReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movementId,
      productStockId,
      quantityBefore,
      oldQuantity,
      remainingQuantity,
      factor,
      newOrderQty,
      newUnitPrice,
    }: {
      movementId: string;
      productStockId: string;
      quantityBefore: number;
      oldQuantity: number;
      remainingQuantity: number | null;
      factor: number;
      newOrderQty: number;
      newUnitPrice: number;
    }) => {
      if (!isLotIntact(oldQuantity, remainingQuantity)) {
        throw new Error("Réception déjà entamée par des ventes — corrigez via un ajustement de stock.");
      }
      const f = factor > 0 ? factor : 1;
      const newQty = Math.round(newOrderQty * f * 1000) / 1000;
      const newUnitCost = Math.round((newUnitPrice / f) * 100000) / 100000;
      const supabase = createClient();

      const { data: stock, error: readErr } = await supabase
        .from("product_stocks")
        .select("current_stock")
        .eq("id", productStockId)
        .single();
      if (readErr) throw readErr;

      const { error: mvtErr } = await supabase
        .from("stock_movements")
        .update({
          quantity: newQty,
          quantity_after: Math.round((quantityBefore + newQty) * 1000) / 1000,
          unit_cost: newUnitCost,
          remaining_quantity: newQty,
        })
        .eq("id", movementId);
      if (mvtErr) throw mvtErr;

      const next = Math.round((stock.current_stock - oldQuantity + newQty) * 1000) / 1000;
      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: next })
        .eq("id", productStockId);
      if (stockErr) throw stockErr;
    },
    onSuccess: () => {
      toast.success("Réception modifiée");
      receptionInvalidate(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la modification"),
  });
}
