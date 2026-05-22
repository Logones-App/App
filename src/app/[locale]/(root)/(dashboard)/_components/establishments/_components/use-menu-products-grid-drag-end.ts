"use client";

import { useCallback } from "react";

import type { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";

import { parseGridCellDroppableId, type PaletteDragData } from "./menu-dnd-types";
import { GRID_SIZE } from "./menu-products-grid-constants";
import { getCellOccupant, type GridItem } from "./menu-products-grid-model";
import type { InsertMenuGridItemPayload } from "./use-insert-menu-grid-item";

type InsertMenuGridMutateOptions = {
  onSuccess?: () => void;
  onError?: (e: unknown) => void;
};

type DragEndDeps = {
  panelMaps: Map<string, GridItem>[];
  menuId: string;
  establishmentId: string;
  organizationId: string;
  parentItemId: string | null;
  insertMutation: {
    mutate: (variables: InsertMenuGridItemPayload, options?: InsertMenuGridMutateOptions) => void;
  };
  onProductDrop: (payload: Omit<InsertMenuGridItemPayload, "priceOverride">, productName: string) => void;
  t: (key: string) => string;
};

export function useMenuProductsGridDragEnd({
  panelMaps,
  menuId,
  establishmentId,
  organizationId,
  parentItemId,
  insertMutation,
  onProductDrop,
  t,
}: DragEndDeps) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const overId = over.id.toString();
      const parsed = parseGridCellDroppableId(overId);
      if (!parsed) return;

      const raw = active.data.current as PaletteDragData | undefined;
      if (!raw) return;

      const { panel, row, localCol } = parsed;
      const occupant = getCellOccupant(panelMaps, panel, row, localCol);
      if (occupant) return;

      const gridColumn = panel * GRID_SIZE + localCol;
      const basePayload = {
        menuId,
        establishmentId,
        organizationId,
        parentItemId,
        gridRow: row,
        gridColumn,
      };

      const onDropError = (err: unknown) => {
        toast.error(t("products_grid_drop_error"), {
          description: err instanceof Error ? err.message : undefined,
        });
      };

      if (raw.kind === "grid_action") {
        insertMutation.mutate(
          {
            ...basePayload,
            itemType: "action",
            label: raw.label,
            categoryId: null,
            productId: null,
            gridAction: { type: raw.actionType, parameters: {} },
          },
          {
            onSuccess: () => toast.success(t("products_grid_drop_success")),
            onError: onDropError,
          },
        );
        return;
      }

      if (raw.kind === "category") {
        insertMutation.mutate(
          {
            ...basePayload,
            itemType: "category",
            label: raw.label,
            categoryId: raw.categoryId,
            productId: null,
          },
          {
            onSuccess: () => toast.success(t("products_grid_drop_success")),
            onError: onDropError,
          },
        );
        return;
      } else {
        onProductDrop(
          {
            ...basePayload,
            itemType: "product",
            label: raw.label,
            categoryId: null,
            productId: raw.productId,
          },
          raw.label,
        );
      }
    },
    [panelMaps, menuId, establishmentId, organizationId, parentItemId, insertMutation, onProductDrop, t],
  );
}
