"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DocLigne } from "@/lib/queries/doc-import-queries";
import { ensureSelfStock } from "@/lib/queries/reception-queries";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

export type DocImportLineRow = Tables<"doc_import_lines">;

// automation_status values
export type DocLineStatus = "pending" | "matched" | "applied" | "skipped";

export function docImportLinesQueryKey(importId: string) {
  return ["doc-import-lines", importId] as const;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export function useDocImportLines(importId: string) {
  return useQuery({
    queryKey: docImportLinesQueryKey(importId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("doc_import_lines")
        .select(
          "*, supplier_reference:supplier_references(id, supplier_product_ref, supplier_product_name, unit_price, order_unit, conversion_factor, supplier:suppliers(id, name)), product:products(id, name, portion_unit)",
        )
        .eq("import_id", importId)
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!importId,
  });
}

// ─── Matérialisation des lignes JSON → DB après validation OCR ───────────────

export function useMaterializeDocLines(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lignes: DocLigne[]) => {
      const supabase = createClient();
      const rows: TablesInsert<"doc_import_lines">[] = lignes.map((l) => ({
        import_id: importId,
        reference: l.reference ?? null,
        designation: l.designation ?? null,
        quantite: l.quantite ?? null,
        unite: l.unite ?? null,
        prix_unitaire: l.prix_unitaire ?? null,
        total_ht: l.total_ht ?? null,
        automation_status: "pending",
      }));
      const { error } = await supabase.from("doc_import_lines").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? "Erreur lors de la création des lignes"),
  });
}

// ─── Matching : associer un product_supplier à une ligne ─────────────────────

export function useMatchDocLine(importId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineId,
      supplierRefId,
      productId,
    }: {
      lineId: string;
      supplierRefId: string | null;
      productId: string | null;
    }) => {
      const supabase = createClient();
      const patch: TablesUpdate<"doc_import_lines"> = {
        supplier_reference_id: supplierRefId,
        product_id: productId,
        automation_status: supplierRefId ? "matched" : "pending",
      };
      const { error } = await supabase.from("doc_import_lines").update(patch).eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
      void queryClient.invalidateQueries({ queryKey: ["all-supplier-references", organizationId] });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? "Erreur lors du matching"),
  });
}

// ─── Options d'application par ligne ─────────────────────────────────────────

export function useUpdateDocLineOptions(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineId,
      applyPrice,
      applyStock,
    }: {
      lineId: string;
      applyPrice: boolean;
      applyStock: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("doc_import_lines")
        .update({ apply_price: applyPrice, apply_stock: applyStock })
        .eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? "Erreur lors de la mise à jour"),
  });
}

// ─── Application d'une ligne (prix + stock) ───────────────────────────────────

export type ApplyDocLinePayload = {
  lineId: string;
  supplierRefId: string;
  productId: string;
  supplierId: string;
  organizationId: string;
  establishmentId: string;
  applyPrice: boolean;
  applyStock: boolean;
  quantity: number;
  unitPrice: number | null;
  unitCost: number | null;
  orderUnit: string | null;
  portionUnit: string | null;
  supplierRef: string | null;
  importId: string;
  contenanceUnitaire: number;
  convertUnit?: {
    fromUnit: string;
    toUnit: string;
    conversionFactor: number;
  };
};

export function useApplyDocLine(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApplyDocLinePayload) => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) throw new Error("Non authentifié");

      const today = new Date().toISOString().slice(0, 10);

      if (payload.applyPrice && payload.unitCost != null) {
        const { error } = await supabase.from("supplier_price_snapshots").insert({
          product_id: payload.productId,
          organization_id: payload.organizationId,
          supplier_reference_id: payload.supplierRefId,
          supplier_id: payload.supplierId,
          unit_price: payload.unitPrice,
          unit_cost: payload.unitCost,
          effective_from: today,
          currency: "EUR",
        });
        if (error) throw error;
      }

      if (payload.applyStock) {
        // ensureSelfStock fige l'unité de gestion + miroir products.portion_unit (cohérence avec le modèle référence).
        const desiredUnit = payload.portionUnit ?? payload.orderUnit ?? "piece";
        const resolved = await ensureSelfStock(supabase, {
          productId: payload.productId,
          establishmentId: payload.establishmentId,
          organizationId: payload.organizationId,
          desiredUnit,
        });
        let currentStock = resolved.currentStock;
        let effectivePortionUnit = payload.portionUnit;

        if (payload.convertUnit) {
          const { fromUnit, toUnit, conversionFactor } = payload.convertUnit;
          const convertedQty = Math.round(currentStock * conversionFactor * 1000) / 1000;
          const { error: unitErr } = await supabase
            .from("product_stocks")
            .update({ unit: toUnit, current_stock: convertedQty })
            .eq("id", resolved.productStockId);
          if (unitErr) throw unitErr;
          const { error: prodErr } = await supabase
            .from("products")
            .update({ portion_unit: toUnit })
            .eq("id", payload.productId);
          if (prodErr) throw prodErr;
          await supabase.from("stock_movements").insert({
            product_id: payload.productId,
            organization_id: payload.organizationId,
            establishment_id: payload.establishmentId,
            product_stock_id: resolved.productStockId,
            movement_type: "adjustment",
            quantity: convertedQty - currentStock,
            quantity_before: currentStock,
            quantity_after: convertedQty,
            unit: toUnit,
            notes: `Conversion d'unité : ${currentStock} ${fromUnit} → ${convertedQty} ${toUnit}`,
            created_by: userId,
            deleted: false,
          });
          currentStock = convertedQty;
          effectivePortionUnit = toUnit;
        }

        const stockQty = payload.quantity * payload.contenanceUnitaire;
        const quantityAfter = currentStock + stockQty;
        const stockUnit = effectivePortionUnit ?? payload.orderUnit;
        const { error: mvtError } = await supabase.from("stock_movements").insert({
          product_id: payload.productId,
          organization_id: payload.organizationId,
          establishment_id: payload.establishmentId,
          product_stock_id: resolved.productStockId,
          supplier_reference_id: payload.supplierRefId,
          movement_type: "purchase",
          quantity: stockQty,
          quantity_before: currentStock,
          quantity_after: quantityAfter,
          unit: stockUnit,
          unit_cost: payload.unitCost,
          reference_type: "doc_import",
          reference_id: payload.importId,
          created_by: userId,
          deleted: false,
        });
        if (mvtError) throw mvtError;
        const { error: stockError } = await supabase
          .from("product_stocks")
          .update({ current_stock: quantityAfter })
          .eq("id", resolved.productStockId);
        if (stockError) throw stockError;
        if (payload.contenanceUnitaire !== 1) {
          const { error: psError } = await supabase
            .from("supplier_references")
            .update({ conversion_factor: payload.contenanceUnitaire })
            .eq("id", payload.supplierRefId);
          if (psError) throw psError;
        }
      }

      const { error } = await supabase
        .from("doc_import_lines")
        .update({ automation_status: "applied", applied_at: new Date().toISOString() })
        .eq("id", payload.lineId);
      if (error) throw error;

      return { stockApplied: payload.applyStock };
    },
    onSuccess: () => {
      toast.success("Ligne appliquée");
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
      void queryClient.invalidateQueries({ queryKey: ["doc-import", importId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'application"),
  });
}

// ─── Ignorer une ligne ────────────────────────────────────────────────────────

export function useSkipDocLine(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, note }: { lineId: string; note?: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("doc_import_lines")
        .update({ automation_status: "skipped", automation_note: note ?? null })
        .eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? "Erreur"),
  });
}

// ─── Auto-matching : détection automatique par référence ─────────────────────

export type AutoMatchResult = {
  lineId: string;
  supplierRefId: string;
  productId: string;
  confidence: "exact" | "normalized" | "designation";
};

export function useAutoMatchDocLines(importId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      lines: Array<{ id: string; reference: string | null; designation: string | null }>,
    ): Promise<AutoMatchResult[]> => {
      const supabase = createClient();
      const refs = lines.map((l) => l.reference).filter(Boolean) as string[];
      if (refs.length === 0) return [];

      const { data: candidates, error } = await supabase
        .from("supplier_references")
        .select("id, supplier_product_ref, supplier_product_name, product_id")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .in("supplier_product_ref", refs);

      if (error) throw error;

      const results: AutoMatchResult[] = [];
      for (const line of lines) {
        if (!line.reference) continue;
        const exactMatch = (candidates ?? []).find((c) => c.supplier_product_ref === line.reference);
        if (exactMatch?.product_id) {
          results.push({
            lineId: line.id,
            supplierRefId: exactMatch.id,
            productId: exactMatch.product_id,
            confidence: "exact",
          });
          continue;
        }
        const normalized = line.reference.toLowerCase().replace(/[\s\-_]/g, "");
        const normalizedMatch = (candidates ?? []).find(
          (c) => c.supplier_product_ref?.toLowerCase().replace(/[\s\-_]/g, "") === normalized,
        );
        if (normalizedMatch?.product_id) {
          results.push({
            lineId: line.id,
            supplierRefId: normalizedMatch.id,
            productId: normalizedMatch.product_id,
            confidence: "normalized",
          });
        }
      }
      return results;
    },
    onSuccess: async (matches) => {
      if (matches.length === 0) return;
      const supabase = createClient();
      await Promise.all(
        matches.map((m) =>
          supabase
            .from("doc_import_lines")
            .update({ supplier_reference_id: m.supplierRefId, product_id: m.productId, automation_status: "matched" })
            .eq("id", m.lineId),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: docImportLinesQueryKey(importId) });
      toast.success(
        `${matches.length} ligne${matches.length > 1 ? "s" : ""} matchée${matches.length > 1 ? "s" : ""} automatiquement`,
      );
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? "Erreur lors du matching automatique"),
  });
}
