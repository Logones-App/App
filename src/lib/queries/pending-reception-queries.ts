"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { PRODUCT_DASHBOARD_QUERY_KEY } from "./product-establishment-dashboard";
import { purchasePriceQueryKey, repriceReferenceFromLatestSnapshot } from "./purchase-price-queries";
import { pendingReceptionsQueryKey } from "./reception-queries";
import { supplierReferenceQueryKey } from "./supplier-queries";

function invalidatePending(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  organizationId: string,
  establishmentId: string,
) {
  void queryClient.invalidateQueries({ queryKey: pendingReceptionsQueryKey(productId, establishmentId) });
  void queryClient.invalidateQueries({ queryKey: purchasePriceQueryKey(productId, organizationId) });
  void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
  void queryClient.invalidateQueries({ queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId] });
}

/**
 * Annule une réception en mode `'pos'` **encore en attente** (doc_import synthétique pas encore
 * appliqué par le POS) : retire le snapshot de prix lié (`source_doc_import_id`), les lignes et le
 * doc_import parent, puis recale le prix catalogue. Aucun stock n'a été appliqué → rien à ajuster.
 */
export function useDeletePendingReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ importId, supplierReferenceId }: { importId: string; supplierReferenceId: string | null }) => {
      const supabase = createClient();
      // Ordre : snapshot d'abord (FK source_doc_import_id), puis lignes, puis parent.
      const { error: snapErr } = await supabase
        .from("supplier_price_snapshots")
        .delete()
        .eq("source_doc_import_id", importId);
      if (snapErr) throw snapErr;
      const { error: lineErr } = await supabase.from("doc_import_lines").delete().eq("import_id", importId);
      if (lineErr) throw lineErr;
      const { error: impErr } = await supabase.from("doc_imports").delete().eq("id", importId);
      if (impErr) throw impErr;
      if (supplierReferenceId) await repriceReferenceFromLatestSnapshot(supabase, supplierReferenceId);
    },
    onSuccess: () => {
      toast.success("Réception en attente annulée");
      invalidatePending(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'annulation"),
  });
}

/**
 * Édite une réception `'pos'` **encore en attente** : met à jour la ligne (`quantite`/`prix_unitaire`)
 * — que le POS appliquera telle quelle — ainsi que le snapshot de prix lié et `unit_price`.
 */
export function useUpdatePendingReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineId,
      importId,
      supplierReferenceId,
      newOrderQty,
      newUnitPrice,
    }: {
      lineId: string;
      importId: string;
      supplierReferenceId: string | null;
      newOrderQty: number;
      newUnitPrice: number;
    }) => {
      const supabase = createClient();
      const { error: lineErr } = await supabase
        .from("doc_import_lines")
        .update({ quantite: newOrderQty, prix_unitaire: newUnitPrice })
        .eq("id", lineId);
      if (lineErr) throw lineErr;

      // Recale le snapshot de prix lié (unit_cost par unité de stock) + le prix catalogue.
      let factor = 1;
      if (supplierReferenceId) {
        const { data: ref } = await supabase
          .from("supplier_references")
          .select("conversion_factor")
          .eq("id", supplierReferenceId)
          .single();
        factor = ref?.conversion_factor && ref.conversion_factor > 0 ? ref.conversion_factor : 1;
      }
      const unitCost = Math.round((newUnitPrice / factor) * 100000) / 100000;
      await supabase
        .from("supplier_price_snapshots")
        .update({ unit_cost: unitCost, unit_price: newUnitPrice })
        .eq("source_doc_import_id", importId);
      if (supplierReferenceId) {
        await supabase.from("supplier_references").update({ unit_price: newUnitPrice }).eq("id", supplierReferenceId);
      }
    },
    onSuccess: () => {
      toast.success("Réception en attente modifiée");
      invalidatePending(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la modification"),
  });
}
