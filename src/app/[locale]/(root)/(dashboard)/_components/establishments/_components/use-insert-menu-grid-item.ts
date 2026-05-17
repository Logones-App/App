"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  categoryGridActionToJson,
  defaultCategoryGridAction,
  type CategoryGridAction,
} from "@/lib/menu-grid/category-grid-action";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
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

      if (p.itemType === "product" && p.productId) {
        const { data: mp, error: mpSelErr } = await supabase
          .from("menus_products")
          .select("id, deleted")
          .eq("menus_id", p.menuId)
          .eq("products_id", p.productId)
          .eq("establishment_id", p.establishmentId)
          .limit(1)
          .maybeSingle();
        if (mpSelErr) throw mpSelErr;

        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("price")
          .eq("id", p.productId)
          .maybeSingle();
        if (prodErr) throw prodErr;
        const price = prod?.price ?? 0;

        if (mp) {
          if (mp.deleted) {
            const { error: upErr } = await supabase
              .from("menus_products")
              .update({ deleted: false, price })
              .eq("id", mp.id);
            if (upErr) throw upErr;
            await insertMenusProductPriceHistoryRow(supabase, mp.id, price, "grid_ui");
          }
        } else {
          const { data: inserted, error: insMpErr } = await supabase
            .from("menus_products")
            .insert({
              menus_id: p.menuId,
              establishment_id: p.establishmentId,
              organization_id: p.organizationId,
              products_id: p.productId,
              price,
              deleted: false,
            })
            .select("id")
            .single();
          if (insMpErr) throw insMpErr;
          if (!inserted?.id) throw new Error("menus_products: insert sans id");
          await insertMenusProductPriceHistoryRow(supabase, inserted.id, price, "grid_ui");
        }
      }

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
      if (p.itemType === "product" && p.productId) {
        queryClient.invalidateQueries({ queryKey: ["menu-products", p.menuId] });
        queryClient.invalidateQueries({
          queryKey: ["establishment-products-not-in-menus", p.establishmentId, p.organizationId],
        });
      }
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
