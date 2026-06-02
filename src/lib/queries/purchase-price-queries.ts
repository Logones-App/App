"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

export type PurchasePriceRow = Tables<"product_purchase_price_history">;
export type PurchasePriceInsert = TablesInsert<"product_purchase_price_history">;

export function purchasePriceQueryKey(productId: string, organizationId: string) {
  return ["purchase-price-history", productId, organizationId] as const;
}

/** Historique complet trié du plus récent au plus ancien. */
export function useProductPurchasePriceHistory(productId: string, organizationId: string) {
  return useQuery({
    queryKey: purchasePriceQueryKey(productId, organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_purchase_price_history")
        .select("*")
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PurchasePriceRow[];
    },
    enabled: !!productId && !!organizationId,
  });
}

/** Prix courant = entrée la plus récente par effective_from (premier élément, trié desc). */
export function getCurrentPurchasePrice(history: PurchasePriceRow[]): PurchasePriceRow | null {
  return history[0] ?? null;
}

/** Prix courant par product_id : dernière entrée de l'historique (effective_from puis created_at desc). */
export function useComponentCurrentPurchasePrices(componentProductIds: string[], organizationId: string) {
  return useQuery({
    queryKey: ["component-purchase-prices", componentProductIds.sort().join(","), organizationId],
    queryFn: async () => {
      if (componentProductIds.length === 0) return new Map<string, number>();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_purchase_price_history")
        .select("product_id, unit_cost, effective_from, created_at")
        .in("product_id", componentProductIds)
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (!map.has(row.product_id)) map.set(row.product_id, row.unit_cost);
      }
      return map;
    },
    enabled: componentProductIds.length > 0 && !!organizationId,
  });
}

/** Ajouter une entrée d'historique. */
export function useAddPurchasePrice(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = purchasePriceQueryKey(productId, organizationId);
  return useMutation({
    mutationFn: async (values: {
      unit_cost: number;
      effective_from: string;
      product_supplier_id?: string;
      supplier_id?: string;
      supplier_ref?: string;
      notes?: string;
      currency?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_purchase_price_history").insert({
        product_id: productId,
        organization_id: organizationId,
        unit_cost: values.unit_cost,
        effective_from: values.effective_from,
        product_supplier_id: values.product_supplier_id ?? null,
        supplier_id: values.supplier_id ?? null,
        supplier_ref: values.supplier_ref?.trim() ?? null,
        notes: values.notes?.trim() ?? null,
        currency: values.currency ?? "EUR",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix d'achat enregistré");
      void queryClient.invalidateQueries({ queryKey: qk });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });
}

/** Supprimer une entrée (hard delete — c'est de l'historique, pas de soft delete). */
export function useDeletePurchasePrice(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = purchasePriceQueryKey(productId, organizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_purchase_price_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrée supprimée");
      void queryClient.invalidateQueries({ queryKey: qk });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
