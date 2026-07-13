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
  /** Prix à utiliser pour menus_products — si fourni, court-circuite la lecture de products.price */
  priceOverride?: number;
  /** TVA à poser sur le PRODUIT (products.vat_rate_id) si le produit n'en a pas — saisie dans la modale. */
  vatRateId?: string;
  /** Si `itemType === "action"`, obligatoire (comportement de la tuile). Sinon défaut `none`. */
  gridAction?: CategoryGridAction;
};

export function useInsertMenuGridItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (p: InsertMenuGridItemPayload) => {
      const supabase = createClient();

      // TVA saisie dans la modale (produit sans vat_rate_id) → posée sur le PRODUIT (global).
      if (p.itemType === "product" && p.productId && p.vatRateId) {
        const { error: vatErr } = await supabase
          .from("products")
          .update({ vat_rate_id: p.vatRateId })
          .eq("id", p.productId);
        if (vatErr) throw vatErr;
      }

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

        const price = p.priceOverride ?? 0;

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
          if (!inserted.id) throw new Error("menus_products: insert sans id");
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
      // Rafraîchit l'indicateur « déjà dans la grille » de la palette.
      queryClient.invalidateQueries({ queryKey: ["menu-palette-catalog", p.establishmentId, p.organizationId] });
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

export type PatchMenuGridItemColorsPayload = {
  gridItemId: string;
  menuId: string;
  establishmentId: string;
  organizationId: string;
  background_color: string | null;
  text_color: string | null;
};

export function usePatchMenuGridItemColorsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: PatchMenuGridItemColorsPayload) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("category_grid_items")
        .update({ background_color: p.background_color, text_color: p.text_color })
        .eq("id", p.gridItemId);
      if (error) throw error;
    },
    onSuccess: (_data, p) => {
      void queryClient.invalidateQueries({
        queryKey: ["menu-category-grid-items", p.menuId, p.establishmentId, p.organizationId],
      });
    },
  });
}

export type MoveMenuGridItemPayload = {
  gridItemId: string;
  gridRow: number;
  gridColumn: number;
  menuId: string;
  establishmentId: string;
  organizationId: string;
};

/** Repositionne une tuile déjà posée (déplacement par appui long) : met à jour sa case grid_row/grid_column. */
export function useMoveMenuGridItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: MoveMenuGridItemPayload) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("category_grid_items")
        .update({ grid_row: p.gridRow, grid_column: p.gridColumn })
        .eq("id", p.gridItemId);
      if (error) throw error;
    },
    onSuccess: (_data, p) => {
      void queryClient.invalidateQueries({
        queryKey: ["menu-category-grid-items", p.menuId, p.establishmentId, p.organizationId],
      });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["menu-palette-catalog", p.establishmentId, p.organizationId] });
    },
  });
}
