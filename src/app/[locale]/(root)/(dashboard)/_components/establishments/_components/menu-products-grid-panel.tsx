"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Swiper as SwiperType } from "swiper";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { Button } from "@/components/ui/button";
import { useMenuCategoryGridItems } from "@/lib/queries/establishments";
import { cn } from "@/lib/utils";

import { MenuPaletteSidebar } from "./menu-palette-sidebar";
import { GRID_SIZE, PANEL_COUNT } from "./menu-products-grid-constants";
import { MenuProductsGridInspector } from "./menu-products-grid-inspector";
import { buildPanelMaps, type GridItem, isCategoryNavigable, type NavCrumb } from "./menu-products-grid-model";
import { MenuGrid6x6 } from "./menu-products-grid-tiles";
import { useInsertMenuGridItemMutation, useSoftDeleteMenuGridItemMutation } from "./use-insert-menu-grid-item";
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

  const parentItemId = navStack.length === 0 ? null : navStack.at(-1)!.id;

  const {
    data: items = [],
    isLoading,
    isError,
    isFetching,
  } = useMenuCategoryGridItems(menuId, establishmentId, organizationId, parentItemId);

  const panelMaps = useMemo(() => buildPanelMaps(items), [items]);
  const insertMutation = useInsertMenuGridItemMutation();
  const deleteMutation = useSoftDeleteMenuGridItemMutation();

  const gridBusy = insertMutation.isPending || deleteMutation.isPending;

  const selectedItem = useMemo(
    () => (selectedItemId ? (items.find((i) => i.id === selectedItemId) ?? null) : null),
    [items, selectedItemId],
  );

  const handleOpenInspector = useCallback((item: GridItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleRemoveTile = useCallback(
    (item: GridItem) => {
      if (!window.confirm(t("products_grid_remove_confirm"))) return;
      deleteMutation.mutate(
        {
          gridItemId: item.id,
          menuId,
          establishmentId,
          organizationId,
        },
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useMenuProductsGridDragEnd({
    panelMaps,
    menuId,
    establishmentId,
    organizationId,
    parentItemId,
    insertMutation,
    t,
  });

  const colStart = (p: number) => p * GRID_SIZE;
  const colEnd = (p: number) => p * GRID_SIZE + (GRID_SIZE - 1);

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
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
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

            <p className="text-muted-foreground mb-2 text-xs">{t("products_grid_caption")}</p>
            <p className="text-muted-foreground mb-2 text-xs">{t("products_grid_swipe_hint")}</p>
            <p className="text-muted-foreground mb-2 text-xs">{t("products_grid_sublevel_hint")}</p>
            <p className="text-muted-foreground mb-3 text-xs">{t("products_grid_inspector_button_hint")}</p>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {t("products_grid_panel_label", { n: activePanel + 1 })}
                {" · "}
                {t("products_grid_columns_hint", {
                  start: colStart(activePanel),
                  end: colEnd(activePanel),
                })}
              </span>
              <span className="text-muted-foreground text-[11px]">
                ({t("products_grid_tile_count", { count: items.length })})
              </span>
              <div className="ml-auto flex flex-wrap gap-1">
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

            {selectedItem && (
              <MenuProductsGridInspector
                selectedItem={selectedItem}
                gridBusy={gridBusy}
                onEnterCategory={enterCategory}
                onRemoveTile={handleRemoveTile}
                onClearSelection={() => setSelectedItemId(null)}
              />
            )}

            <Swiper
              key={parentNavKey}
              modules={[Pagination]}
              slidesPerView={1}
              spaceBetween={16}
              pagination={{ clickable: true, dynamicBullets: true }}
              resistanceRatio={0.85}
              onSlideChange={(s) => setActivePanel(s.activeIndex)}
              onSwiper={(instance) => {
                swiperRef.current = instance;
              }}
              className="menu-products-grid-swiper pb-10"
            >
              {Array.from({ length: PANEL_COUNT }, (_, panelIndex) => (
                <SwiperSlide key={panelIndex}>
                  <div className="px-0.5">
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-[11px]">
                      <span>{t("products_grid_panel_label", { n: panelIndex + 1 })}</span>
                      <span>
                        {t("products_grid_columns_hint", {
                          start: colStart(panelIndex),
                          end: colEnd(panelIndex),
                        })}
                      </span>
                    </div>
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
          </div>
        </div>

        <aside className="lg:col-span-1">
          <MenuPaletteSidebar establishmentId={establishmentId} organizationId={organizationId} />
        </aside>
      </div>
    </DndContext>
  );
}
