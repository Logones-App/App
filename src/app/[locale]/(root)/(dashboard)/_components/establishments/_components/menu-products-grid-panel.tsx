"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { Button } from "@/components/ui/button";
import { useMenuCategoryGridItems } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type { PaletteDragData } from "./menu-dnd-types";
import { MenuGridPriceModal } from "./menu-grid-price-modal";
import { MenuPaletteSidebar } from "./menu-palette-sidebar";
import { PANEL_COUNT } from "./menu-products-grid-constants";
import { MenuProductsGridInspector } from "./menu-products-grid-inspector";
import { buildPanelMaps, type GridItem, isCategoryNavigable, type NavCrumb } from "./menu-products-grid-model";
import { MenuGrid6x6 } from "./menu-products-grid-tiles";
import {
  type InsertMenuGridItemPayload,
  useInsertMenuGridItemMutation,
  useMoveMenuGridItemMutation,
  useSoftDeleteMenuGridItemMutation,
} from "./use-insert-menu-grid-item";
import { useMenuProductsGridDragEnd } from "./use-menu-products-grid-drag-end";

import "swiper/css";
import "swiper/css/pagination";

export function MenuProductsGridPanel({
  menuId,
  establishmentId,
  organizationId,
}: {
  menuId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const t = useTranslations("establishments.menus_page");
  const swiperRef = useRef<SwiperType | null>(null);
  const [activePanel, setActivePanel] = useState(0);
  const [navStack, setNavStack] = useState<NavCrumb[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    payload: Omit<InsertMenuGridItemPayload, "priceOverride">;
    productName: string;
  } | null>(null);

  const parentItemId = navStack.length === 0 ? null : navStack.at(-1)!.id;

  const {
    data: items = [],
    isLoading,
    isError,
    isFetching,
  } = useMenuCategoryGridItems(menuId, establishmentId, organizationId, parentItemId);

  const panelMaps = useMemo(() => buildPanelMaps(items), [items]);
  const insertMutation = useInsertMenuGridItemMutation();
  const moveMutation = useMoveMenuGridItemMutation();
  const deleteMutation = useSoftDeleteMenuGridItemMutation();

  const gridBusy = insertMutation.isPending || moveMutation.isPending || deleteMutation.isPending;

  const selectedItem = useMemo(
    () => (selectedItemId ? (items.find((i) => i.id === selectedItemId) ?? null) : null),
    [items, selectedItemId],
  );

  const handleOpenInspector = useCallback((item: GridItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleRemoveTile = useCallback(
    (item: GridItem) => {
      deleteMutation.mutate(
        { gridItemId: item.id, menuId, establishmentId, organizationId },
        {
          onSuccess: () => {
            setSelectedItemId((cur) => (cur === item.id ? null : cur));
            toast.success(t("products_grid_remove_success"));
          },
          onError: () => toast.error(t("products_grid_remove_error")),
        },
      );
    },
    [deleteMutation, menuId, establishmentId, organizationId, t],
  );

  // Le drag ne part que de la poignée (coin bas droite) des tuiles → activation par distance suffit
  // (pas d'appui long). Le corps de la tuile reste libre pour le tap et le swipe du carrousel.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleProductDrop = useCallback(
    async (payload: Omit<InsertMenuGridItemPayload, "priceOverride">, productName: string) => {
      if (!payload.productId) return;
      const supabase = createClient();
      const { data: mp } = await supabase
        .from("menus_products")
        .select("id, deleted")
        .eq("menus_id", menuId)
        .eq("products_id", payload.productId)
        .eq("establishment_id", establishmentId)
        .maybeSingle();
      const hasPrice = mp && !mp.deleted;
      if (hasPrice) {
        insertMutation.mutate(payload, {
          onSuccess: () => toast.success(t("products_grid_drop_success")),
          onError: (err) =>
            toast.error(t("products_grid_drop_error"), { description: err instanceof Error ? err.message : undefined }),
        });
      } else {
        setPendingDrop({ payload, productName });
      }
    },
    [menuId, establishmentId, insertMutation, t],
  );

  const handleDragEnd = useMenuProductsGridDragEnd({
    panelMaps,
    menuId,
    establishmentId,
    organizationId,
    parentItemId,
    insertMutation,
    moveMutation,
    onProductDrop: handleProductDrop,
    t,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as PaletteDragData | undefined;
    setActiveDragLabel(data?.label ?? "");
  }, []);

  const parentNavKey = parentItemId ?? "root";

  useEffect(() => {
    setActivePanel(0);
    swiperRef.current?.slideTo(0, 0);
    setSelectedItemId(null);
  }, [parentNavKey]);

  useEffect(() => {
    if (selectedItemId && !items.some((i) => i.id === selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [items, selectedItemId]);

  const enterCategory = (item: GridItem) => {
    if (!isCategoryNavigable(item)) return;
    setSelectedItemId(null);
    setNavStack((prev) => [...prev, { id: item.id, label: item.label }]);
  };

  const goToRoot = () => setNavStack([]);
  const goBack = () => setNavStack((prev) => prev.slice(0, -1));
  const goToCrumb = (index: number) => setNavStack((prev) => prev.slice(0, index + 1));

  if (isLoading) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-8">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">{t("products_grid_loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
        {t("products_grid_error")}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={(event) => {
        setActiveDragLabel(null);
        handleDragEnd(event);
      }}
      onDragCancel={() => setActiveDragLabel(null)}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-4 lg:grid-cols-4 lg:items-start",
          gridBusy && "pointer-events-none opacity-70",
        )}
      >
        <div className="lg:col-span-3">
          <div className="bg-card rounded-xl border p-3 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <nav
                aria-label={t("products_grid_nav_aria")}
                className="flex min-w-0 flex-wrap items-center gap-1 text-xs"
              >
                <Button
                  type="button"
                  variant={navStack.length === 0 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={goToRoot}
                >
                  {t("products_grid_root")}
                </Button>
                {navStack.map((crumb, index) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                    <Button
                      type="button"
                      variant={index === navStack.length - 1 ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 max-w-[140px] truncate px-2"
                      title={crumb.label ?? undefined}
                      onClick={() => index < navStack.length - 1 && goToCrumb(index)}
                      disabled={index === navStack.length - 1}
                    >
                      {crumb.label ?? "—"}
                    </Button>
                  </span>
                ))}
                {isFetching && <Loader2 className="text-muted-foreground ml-1 size-3.5 animate-spin" aria-hidden />}
              </nav>
              {navStack.length > 0 && (
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1" onClick={goBack}>
                  <ArrowLeft className="size-3.5" />
                  {t("products_grid_back")}
                </Button>
              )}
            </div>

            <MenuProductsGridInspector
              selectedItem={selectedItem}
              open={selectedItemId !== null}
              onOpenChange={(o) => {
                if (!o) setSelectedItemId(null);
              }}
              menuId={menuId}
              establishmentId={establishmentId}
              organizationId={organizationId}
              gridBusy={gridBusy}
              onEnterCategory={enterCategory}
              onRemoveTile={handleRemoveTile}
            />

            <Swiper
              key={parentNavKey}
              modules={[]}
              slidesPerView={1}
              spaceBetween={16}
              resistanceRatio={0.85}
              onSlideChange={(s) => setActivePanel(s.activeIndex)}
              onSwiper={(instance) => {
                swiperRef.current = instance;
              }}
              className="menu-products-grid-swiper"
            >
              {Array.from({ length: PANEL_COUNT }, (_, panelIndex) => (
                <SwiperSlide key={panelIndex}>
                  <div className="px-0.5">
                    <MenuGrid6x6
                      panelMaps={panelMaps}
                      panelIndex={panelIndex}
                      selectedItemId={selectedItemId}
                      onOpenInspector={handleOpenInspector}
                      onCategoryEnter={enterCategory}
                      inspectorDisabled={gridBusy}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: PANEL_COUNT }, (_, i) => (
                <Button
                  key={i}
                  type="button"
                  size="sm"
                  variant={activePanel === i ? "default" : "outline"}
                  className="h-8 min-w-8 px-2"
                  onClick={() => swiperRef.current?.slideTo(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <MenuPaletteSidebar menuId={menuId} establishmentId={establishmentId} organizationId={organizationId} />
        </aside>
      </div>
      <MenuGridPriceModal
        open={pendingDrop !== null}
        productName={pendingDrop?.productName ?? ""}
        onConfirm={(price) => {
          if (!pendingDrop) return;
          insertMutation.mutate(
            { ...pendingDrop.payload, priceOverride: price },
            {
              onSuccess: () => toast.success(t("products_grid_drop_success")),
              onError: (err) =>
                toast.error(t("products_grid_drop_error"), {
                  description: err instanceof Error ? err.message : undefined,
                }),
            },
          );
          setPendingDrop(null);
        }}
        onCancel={() => setPendingDrop(null)}
      />
      <DragOverlay dropAnimation={null}>
        {activeDragLabel !== null ? (
          <div className="bg-card ring-primary flex h-full w-full items-center justify-center rounded-md border p-1 text-center shadow-lg ring-2">
            <span className="line-clamp-3 text-[10px] leading-tight font-medium">{activeDragLabel}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
