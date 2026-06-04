"use client";

import { type CSSProperties, type ElementType } from "react";

import { useDroppable } from "@dnd-kit/core";
import { FolderOpen, Settings2, Tag, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GRID_SIZE } from "./menu-products-grid-constants";
import { getPanelMapAt, isCategoryNavigable, type GridItem } from "./menu-products-grid-model";

const priceFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function tileTypeIcon(itemType: string): ElementType {
  if (itemType === "category") return FolderOpen;
  if (itemType === "action") return Zap;
  return Tag;
}

function tilePriceLabel(item: GridItem): string | null {
  if (item.item_type !== "product" || item.menuProductPrice == null) return null;
  return priceFormatter.format(item.menuProductPrice);
}

function gridItemSurfaceStyle(item: GridItem): CSSProperties {
  const s: CSSProperties = {};
  if (item.background_color) {
    s.backgroundColor = item.background_color;
  }
  if (item.text_color) {
    s.color = item.text_color;
  }
  return s;
}

export function DroppableEmptyCell({
  panelIndex,
  row,
  localCol,
}: {
  panelIndex: number;
  row: number;
  localCol: number;
}) {
  const id = `grid-cell-${panelIndex}-${row}-${localCol}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-muted-foreground/20 flex h-full min-h-0 min-w-0 items-center justify-center rounded-md border border-dashed",
        "bg-muted/10 text-muted-foreground/40 text-[10px]",
        isOver && "border-primary bg-primary/10 text-primary/80 ring-primary/30 ring-1",
      )}
    >
      ·
    </div>
  );
}

export function GridTile({
  item,
  panelIndex,
  row,
  localCol,
  selected,
  onOpenInspector,
  onCategoryEnter,
  inspectorDisabled,
}: {
  item: GridItem | null;
  panelIndex: number;
  row: number;
  localCol: number;
  selected: boolean;
  onOpenInspector: (item: GridItem) => void;
  onCategoryEnter?: (item: GridItem) => void;
  inspectorDisabled?: boolean;
}) {
  const t = useTranslations("establishments.menus_page");

  if (!item) {
    return <DroppableEmptyCell panelIndex={panelIndex} row={row} localCol={localCol} />;
  }

  const navigable = isCategoryNavigable(item) && Boolean(onCategoryEnter);
  const isUnavailable = item.item_type === "product" && item.product?.is_available === false;
  const TypeIcon = tileTypeIcon(item.item_type);
  const price = tilePriceLabel(item);

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      {/* Badge type — haut gauche */}
      <span className="border-border/80 bg-background/95 absolute top-0 left-0 z-10 flex size-5 items-center justify-center rounded-full border shadow-sm">
        <TypeIcon className="size-2.5" aria-hidden />
      </span>

      {/* Bouton paramètres — haut droite */}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled={inspectorDisabled}
        className="border-border/80 bg-background/95 hover:bg-muted absolute top-0 right-0 z-10 size-5 shrink-0 rounded-full border p-0 shadow-sm"
        aria-label={t("products_grid_inspector_open_aria")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpenInspector(item);
        }}
      >
        <Settings2 className="size-2.5" aria-hidden />
      </Button>

      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 pt-5 pb-1 text-center shadow-sm transition-transform",
          !item.is_visible && "opacity-45",
          isUnavailable && "opacity-50 grayscale",
          item.item_type === "action" && "border-amber-500/40 bg-amber-500/5",
          navigable && "cursor-pointer hover:brightness-95 active:scale-[0.98]",
          !navigable && "cursor-default",
          selected && "ring-primary ring-offset-background ring-2 ring-offset-2",
        )}
        style={gridItemSurfaceStyle(item)}
        title={item.label ?? undefined}
        role={navigable ? "button" : undefined}
        tabIndex={navigable ? 0 : -1}
        onClick={() => navigable && onCategoryEnter?.(item)}
        onKeyDown={(e) => {
          if (!navigable) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCategoryEnter?.(item);
          }
        }}
      >
        <span className="line-clamp-2 w-full text-[10px] leading-tight font-medium">{item.label ?? "—"}</span>
        {price && <span className="mt-0.5 text-[9px] font-semibold tabular-nums opacity-90">{price}</span>}
        {isUnavailable && (
          <span className="bg-muted-foreground/20 rounded px-1 text-[7px] tracking-wide uppercase">indispo</span>
        )}
      </div>
    </div>
  );
}

export function MenuGrid6x6({
  panelMaps,
  panelIndex,
  selectedItemId,
  onOpenInspector,
  onCategoryEnter,
  inspectorDisabled,
}: {
  panelMaps: Map<string, GridItem>[];
  panelIndex: number;
  selectedItemId: string | null;
  onOpenInspector: (item: GridItem) => void;
  onCategoryEnter?: (item: GridItem) => void;
  inspectorDisabled?: boolean;
}) {
  const map = getPanelMapAt(panelMaps, panelIndex) ?? new Map<string, GridItem>();
  return (
    <div className="grid aspect-square max-h-[min(72vw,520px)] w-full grid-cols-6 grid-rows-6 gap-1 sm:max-h-[480px] [&>*]:min-h-0">
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const localCol = i % GRID_SIZE;
        const cellItem = map.get(`${row}-${localCol}`) ?? null;
        return (
          <GridTile
            key={`${panelIndex}-${row}-${localCol}`}
            item={cellItem}
            panelIndex={panelIndex}
            row={row}
            localCol={localCol}
            selected={cellItem != null && cellItem.id === selectedItemId}
            onOpenInspector={onOpenInspector}
            onCategoryEnter={onCategoryEnter}
            inspectorDisabled={inspectorDisabled}
          />
        );
      })}
    </div>
  );
}
