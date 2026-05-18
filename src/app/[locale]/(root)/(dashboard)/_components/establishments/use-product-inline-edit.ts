"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type ProductRow = Tables<"products">;
export type EditableField = "name" | "description" | "is_available";
export type ActiveCell = { productId: string; field: EditableField };

const EDITABLE_FIELDS: EditableField[] = ["name", "description", "is_available"];

export function useProductInlineEdit(organizationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["organization-products", organizationId];

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<Partial<ProductRow>>({});

  const mutation = useMutation({
    mutationFn: async ({ productId, patch }: { productId: string; patch: Partial<ProductRow> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").update(patch).eq("id", productId);
      if (error) throw error;
    },
    onMutate: async ({ productId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ProductRow[]>(queryKey);
      queryClient.setQueryData<ProductRow[]>(
        queryKey,
        (old) => old?.map((p) => (p.id === productId ? { ...p, ...patch } : p)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Erreur lors de la sauvegarde");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const saveCell = (productId: string, field: EditableField, value: unknown) => {
    const patch = { [field]: value } as Partial<ProductRow>;
    mutation.mutate({ productId, patch });
    setActiveCell(null);
  };

  const activateCell = (productId: string, field: EditableField) => {
    if (editingRowId) return;
    setActiveCell({ productId, field });
  };

  const deactivateCell = () => setActiveCell(null);

  const tabToNext = (productId: string, currentField: EditableField) => {
    const idx = EDITABLE_FIELDS.indexOf(currentField);
    const next = EDITABLE_FIELDS[idx + 1];
    if (next) setActiveCell({ productId, field: next });
    else setActiveCell(null);
  };

  const startRowEdit = (product: ProductRow) => {
    setActiveCell(null);
    setEditingRowId(product.id);
    setRowDraft({
      name: product.name,
      description: product.description,
      is_available: product.is_available ?? true,
    });
  };

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowDraft({});
  };

  const confirmRowEdit = (productId: string) => {
    mutation.mutate({ productId, patch: rowDraft });
    setEditingRowId(null);
    setRowDraft({});
  };

  const patchRowDraft = (patch: Partial<ProductRow>) => {
    setRowDraft((prev) => ({ ...prev, ...patch }));
  };

  return {
    activeCell,
    activateCell,
    deactivateCell,
    tabToNext,
    saveCell,
    editingRowId,
    rowDraft,
    patchRowDraft,
    startRowEdit,
    cancelRowEdit,
    confirmRowEdit,
    isPending: mutation.isPending,
  };
}
