"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  categoryGridActionToJson,
  defaultCategoryGridAction,
  type CategoryGridAction,
} from "@/lib/menu-grid/category-grid-action";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export type InsertMenuGridItemPayload = {
  menuId: string;
  establishmentId: string;
  organizationId: string;
  parentItemId: string | null;
  gridRow: number;
  gridColumn: number;
  itemType: "category" | "product" | "action";
  label: string;
  categoryId: string | null;
  productId: string | null;
  /** Si `itemType === "action"`, obligatoire (comportement de la tuile). Sinon défaut `none`. */
  gridAction?: CategoryGridAction;
};

export function useInsertMenuGridItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (p: InsertMenuGridItemPayload) => {
      const supabase = createClient();

      /** Ne pas envoyer `action` pour category/product : base sans colonne → 400 PostgREST ; défaut SQL s’applique si la colonne existe. */
      const base = {
        menu_id: p.menuId,
        establishment_id: p.establishmentId,
        organization_id: p.organizationId,
        parent_item_id: p.parentItemId,
        grid_row: p.gridRow,
        grid_column: p.gridColumn,
        item_type: p.itemType,
        label: p.label,
        category_id: p.categoryId,
        product_id: p.productId,
        is_visible: true,
        deleted: false,
        display_order: 0,
      } as const;

      const insertRow =
        p.itemType === "action"
          ? {
              ...base,
              action: categoryGridActionToJson(p.gridAction ?? defaultCategoryGridAction()) as Json,
            }
          : base;

      const { error } = await supabase.from("category_grid_items").insert(insertRow);
      if (error) throw error;
    },
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({
        queryKey: ["menu-category-grid-items", p.menuId, p.establishmentId, p.organizationId],
      });
    },
  });
}

export type SoftDeleteMenuGridItemPayload = {
  gridItemId: string;
  menuId: string;
  establishmentId: string;
  organizationId: string;
};

/** Soft delete : `deleted = true` (aligné sur `useMenuCategoryGridItems` qui filtre `deleted = false`). */
export function useSoftDeleteMenuGridItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (p: SoftDeleteMenuGridItemPayload) => {
      const supabase = createClient();
      const { error } = await supabase.from("category_grid_items").update({ deleted: true }).eq("id", p.gridItemId);
      if (error) throw error;
    },
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({
        queryKey: ["menu-category-grid-items", p.menuId, p.establishmentId, p.organizationId],
      });
    },
  });
}
