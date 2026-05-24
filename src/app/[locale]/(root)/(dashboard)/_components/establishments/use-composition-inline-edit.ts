"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PRODUCT_DASHBOARD_QUERY_KEY } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type CompositionRow = Tables<"product_compositions">;
export type CompositionEditableField =
  | "composition_kind"
  | "default_quantity"
  | "max_quantity"
  | "show_in_customization";
export type CompositionActiveCell = { id: string; field: CompositionEditableField };

const EDITABLE_FIELDS: CompositionEditableField[] = [
  "composition_kind",
  "default_quantity",
  "max_quantity",
  "show_in_customization",
];

export type NewCompositionDraft = {
  component_product_id: string;
  composition_kind: "recipe" | "modifier";
  default_quantity: number;
  max_quantity: number | null;
  show_in_customization: boolean;
  quantity_unit?: string | null;
};

const DEFAULT_DRAFT: NewCompositionDraft = {
  component_product_id: "",
  composition_kind: "recipe",
  default_quantity: 1,
  max_quantity: null,
  show_in_customization: false,
};

type Props = {
  productId: string;
  establishmentId: string;
  organizationId: string;
};

export function useCompositionInlineEdit({ productId, establishmentId, organizationId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId];

  const [activeCell, setActiveCell] = useState<CompositionActiveCell | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newDraft, setNewDraft] = useState<NewCompositionDraft>(DEFAULT_DRAFT);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CompositionRow> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_compositions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
    onSettled: invalidate,
  });

  const insertMutation = useMutation({
    mutationFn: async (draft: NewCompositionDraft) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_compositions").insert({
        main_product_id: productId,
        component_product_id: draft.component_product_id,
        composition_kind: draft.composition_kind,
        default_quantity: draft.default_quantity,
        quantity_unit: draft.quantity_unit ?? null,
        max_quantity: draft.max_quantity,
        show_in_customization: draft.show_in_customization,
        establishment_id: establishmentId,
        organization_id: organizationId,
        is_required: false,
        deleted: false,
      });
      if (error) throw error;
    },
    onError: () => toast.error("Erreur lors de l'ajout de l'ingrédient"),
    onSuccess: () => {
      setIsAddingRow(false);
      setNewDraft(DEFAULT_DRAFT);
      toast.success("Ingrédient ajouté");
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_compositions").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("Erreur lors de la suppression"),
    onSuccess: () => toast.success("Ligne supprimée"),
    onSettled: invalidate,
  });

  const saveCell = (id: string, field: CompositionEditableField, value: unknown) => {
    updateMutation.mutate({ id, patch: { [field]: value } as Partial<CompositionRow> });
    setActiveCell(null);
  };

  const tabToNext = (id: string, currentField: CompositionEditableField) => {
    const idx = EDITABLE_FIELDS.indexOf(currentField);
    const next = EDITABLE_FIELDS[idx + 1];
    setActiveCell(next != null ? { id, field: next } : null);
  };

  const startAddRow = () => {
    setActiveCell(null);
    setNewDraft(DEFAULT_DRAFT);
    setIsAddingRow(true);
  };

  const cancelAdd = () => {
    setIsAddingRow(false);
    setNewDraft(DEFAULT_DRAFT);
  };

  const confirmAdd = () => {
    if (!newDraft.component_product_id) {
      toast.error("Sélectionnez un ingrédient");
      return;
    }
    insertMutation.mutate(newDraft);
  };

  const patchNewDraft = (patch: Partial<NewCompositionDraft>) => setNewDraft((prev) => ({ ...prev, ...patch }));

  const deleteRow = (id: string) => deleteMutation.mutate(id);

  return {
    activeCell,
    setActiveCell,
    isCell: (id: string, field: CompositionEditableField) => activeCell?.id === id && activeCell.field === field,
    saveCell,
    tabToNext,
    isAddingRow,
    newDraft,
    patchNewDraft,
    startAddRow,
    cancelAdd,
    confirmAdd,
    deleteRow,
    insertMutation,
    isPending: updateMutation.isPending || insertMutation.isPending || deleteMutation.isPending,
  };
}
