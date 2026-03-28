"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { parseCategoryGridAction, resolveGridTapIntent } from "@/lib/menu-grid/category-grid-action";

import { isCategoryNavigable, tapIntentTranslationKey, type GridItem } from "./menu-products-grid-model";

export function MenuProductsGridInspector({
  selectedItem,
  gridBusy,
  onEnterCategory,
  onRemoveTile,
  onClearSelection,
}: {
  selectedItem: GridItem;
  gridBusy: boolean;
  onEnterCategory: (item: GridItem) => void;
  onRemoveTile: (item: GridItem) => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("establishments.menus_page");

  return (
    <div className="bg-muted/25 mb-3 rounded-lg border p-3 text-sm shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-xs font-medium">{t("products_grid_inspector_title")}</p>
          <p className="truncate text-base leading-tight font-semibold">{selectedItem.label ?? "—"}</p>
          <dl className="text-muted-foreground grid gap-1 text-xs">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="font-medium">{t("products_grid_field_type")}</dt>
              <dd className="text-foreground">{selectedItem.item_type}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="font-medium">{t("products_grid_field_position")}</dt>
              <dd className="text-foreground">
                {selectedItem.grid_row} / {selectedItem.grid_column}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="font-medium">{t("products_grid_field_visible")}</dt>
              <dd className="text-foreground">
                {selectedItem.is_visible ? t("products_grid_visible_yes") : t("products_grid_visible_no")}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="font-medium">{t("products_grid_field_action_type")}</dt>
              <dd className="text-foreground font-mono text-[11px]">
                {parseCategoryGridAction(selectedItem.action).type}
              </dd>
            </div>
            <div className="flex flex-col gap-y-0.5">
              <dt className="font-medium">{t("products_grid_field_tap_preview")}</dt>
              <dd className="text-foreground">{t(tapIntentTranslationKey(resolveGridTapIntent(selectedItem)))}</dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px] sm:items-stretch">
          {isCategoryNavigable(selectedItem) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 gap-1"
              disabled={gridBusy}
              onClick={() => onEnterCategory(selectedItem)}
            >
              {t("products_grid_open_subcategory")}
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-9 gap-1.5"
            disabled={gridBusy}
            aria-label={t("products_grid_remove_aria")}
            onClick={() => onRemoveTile(selectedItem)}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
            {t("products_grid_remove_button")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8"
            onClick={onClearSelection}
          >
            {t("products_grid_clear_selection")}
          </Button>
        </div>
      </div>
    </div>
  );
}
