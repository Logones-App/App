"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Home, Package, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PALETTE_GRID_ACTION_PRESETS, type PaletteGridActionPreset } from "@/lib/menu-grid/category-grid-action";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

import type { PaletteDragData } from "./menu-dnd-types";

function DraggableProductRow({
  product,
  menuPrice,
  locale,
}: {
  product: Tables<"products">;
  menuPrice?: number;
  locale: string;
}) {
  const t = useTranslations("establishments.menus_page");
  const formatted =
    menuPrice !== undefined
      ? new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(menuPrice)
      : null;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-product-${product.id}`,
    data: {
      kind: "product",
      productId: product.id,
      label: product.name,
    } satisfies PaletteDragData,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start justify-between gap-1 rounded-md border border-transparent px-1 py-1.5 text-xs",
        "hover:bg-muted/60",
        isDragging && "ring-primary/30 z-50 opacity-60 ring-2",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={t("products_palette_drag_handle_aria")}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="min-w-0 flex-1 leading-snug">{product.name}</span>
      {formatted !== null ? (
        <span className="text-muted-foreground shrink-0 tabular-nums">{formatted}</span>
      ) : (
        <span className="text-muted-foreground/50 shrink-0 text-[10px] italic">—</span>
      )}
    </div>
  );
}

function paletteActionIcon(actionType: PaletteGridActionPreset) {
  switch (actionType) {
    case "back":
      return ArrowLeft;
    case "navigate_root":
      return Undo2;
    case "navigate_home":
      return Home;
    default:
      return Package;
  }
}

export function DraggableGridActionStrip({
  actionType,
  label,
}: {
  actionType: PaletteGridActionPreset;
  label: string;
}) {
  const t = useTranslations("establishments.menus_page");
  const Icon = paletteActionIcon(actionType);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-grid-action-${actionType}`,
    data: {
      kind: "grid_action",
      actionType,
      label,
    } satisfies PaletteDragData,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border border-dashed border-amber-500/35 bg-amber-500/5 px-2 py-1.5 text-xs",
        isDragging && "ring-primary/30 z-50 opacity-60 ring-2",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={t("products_palette_drag_handle_aria")}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Icon className="size-3.5 shrink-0 text-amber-700/80 dark:text-amber-400/90" aria-hidden />
      <span className="min-w-0 flex-1 leading-snug font-medium">{label}</span>
    </div>
  );
}

export function DraggableCategoryStrip({ categoryId, label }: { categoryId: string; label: string }) {
  const t = useTranslations("establishments.menus_page");
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-category-${categoryId}`,
    data: {
      kind: "category",
      categoryId,
      label,
    } satisfies PaletteDragData,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-muted-foreground/25 bg-muted/20 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs",
        isDragging && "ring-primary/30 z-50 opacity-60 ring-2",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={t("products_palette_drag_handle_aria")}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Package className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 leading-snug font-medium">{label}</span>
      <span className="text-muted-foreground shrink-0 text-[10px]">{t("products_palette_drag_category_hint")}</span>
    </div>
  );
}

export function ProductList({
  products,
  priceByProductId,
  locale,
}: {
  products: Tables<"products">[];
  priceByProductId?: Record<string, number>;
  locale: string;
}) {
  return (
    <ul className="space-y-0.5 pb-2" role="list">
      {products.map((p) => (
        <li key={p.id}>
          <DraggableProductRow
            product={p}
            menuPrice={priceByProductId && Object.hasOwn(priceByProductId, p.id) ? priceByProductId[p.id] : undefined}
            locale={locale}
          />
        </li>
      ))}
    </ul>
  );
}

const PRESET_LABEL_KEYS = {
  back: "products_palette_action_back",
  navigate_root: "products_palette_action_navigate_root",
  navigate_home: "products_palette_action_navigate_home",
} as const satisfies Record<PaletteGridActionPreset, string>;

export function PaletteSystemActionsSection({ className }: { className?: string }) {
  const t = useTranslations("establishments.menus_page");
  return (
    <div className={cn("border-b px-3 py-3", className)}>
      <p className="text-xs font-medium">{t("products_palette_actions_title")}</p>
      <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">{t("products_palette_actions_hint")}</p>
      <div className="mt-2 space-y-1.5">
        {PALETTE_GRID_ACTION_PRESETS.map((preset) => (
          // eslint-disable-next-line security/detect-object-injection
          <DraggableGridActionStrip key={preset} actionType={preset} label={t(PRESET_LABEL_KEYS[preset])} />
        ))}
      </div>
    </div>
  );
}
