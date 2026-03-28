"use client";

import { Loader2, Package } from "lucide-react";
import { useTranslations } from "next-intl";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MenuPaletteCategory } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

import { DraggableCategoryStrip, PaletteSystemActionsSection, ProductList } from "./menu-palette-sidebar-widgets";

type ByCat = Record<string, Tables<"products">[]>;

export function MenuPaletteSidebarLoading() {
  const t = useTranslations("establishments.menus_page");
  return (
    <div className="bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-xl border p-4">
      <Loader2 className="size-4 shrink-0 animate-spin" />
      <span className="text-xs">{t("products_palette_loading")}</span>
    </div>
  );
}

export function MenuPaletteSidebarError({ message }: { message?: string }) {
  const t = useTranslations("establishments.menus_page");
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-xs">
      <p>{t("products_grid_error")}</p>
      {message ? <p className="text-muted-foreground mt-2 font-mono text-[10px]">{message}</p> : null}
    </div>
  );
}

export function MenuPaletteSidebarEmptyCatalog() {
  const t = useTranslations("establishments.menus_page");
  return (
    <div className="bg-muted/30 rounded-xl border">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">{t("products_sidebar_title")}</h3>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{t("products_sidebar_hint")}</p>
      </div>
      <ScrollArea className="max-h-[min(70vh,560px)]">
        <PaletteSystemActionsSection className="border-b-0" />
      </ScrollArea>
      <p className="text-muted-foreground border-t p-4 text-xs">{t("products_palette_empty")}</p>
    </div>
  );
}

export function MenuPaletteSidebarOrphansOnly({
  orphanProducts,
  locale,
}: {
  orphanProducts: Tables<"products">[];
  locale: string;
}) {
  const t = useTranslations("establishments.menus_page");
  return (
    <div className="bg-muted/30 rounded-xl border">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">{t("products_sidebar_title")}</h3>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{t("products_sidebar_hint")}</p>
      </div>
      <div className="p-3">
        <ScrollArea className="max-h-[min(70vh,560px)]">
          <PaletteSystemActionsSection className="bg-muted/20 rounded-md border" />
          <p className="text-muted-foreground mb-2 px-1 pt-3 text-xs font-medium">{t("products_palette_flat_title")}</p>
          <ProductList products={orphanProducts} locale={locale} />
        </ScrollArea>
        <p className="text-muted-foreground mt-2 text-[10px]">
          {t("products_grid_tile_count", { count: orphanProducts.length })}
        </p>
      </div>
    </div>
  );
}

export function MenuPaletteSidebarFullCatalog({
  categories,
  byCat,
  orphanProducts,
  locale,
  totalListed,
}: {
  categories: MenuPaletteCategory[];
  byCat: ByCat;
  orphanProducts: Tables<"products">[];
  locale: string;
  totalListed: number;
}) {
  const t = useTranslations("establishments.menus_page");
  const firstId = categories[0]?.id;

  return (
    <div className="bg-muted/30 rounded-xl border">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">{t("products_sidebar_title")}</h3>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{t("products_sidebar_hint")}</p>
        {totalListed > 0 ? (
          <p className="text-muted-foreground mt-2 text-[10px]">
            {t("products_grid_tile_count", { count: totalListed })}
          </p>
        ) : null}
      </div>

      <ScrollArea className="max-h-[min(70vh,560px)]">
        <PaletteSystemActionsSection />
        <Accordion type="multiple" className="w-full px-2" defaultValue={firstId ? [firstId] : undefined}>
          {categories.map((cat) => {
            const products = byCat[cat.id] ?? [];
            const count = products.length;
            return (
              <AccordionItem key={cat.id} value={cat.id} className="border-b last:border-b-0">
                <AccordionTrigger className="py-3 text-xs hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Package className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                    <span className="truncate font-medium">{cat.name}</span>
                    <span className="text-muted-foreground shrink-0 font-normal">
                      ({t("products_palette_product_count", { count })})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <DraggableCategoryStrip categoryId={cat.id} label={cat.name} />
                  {count === 0 ? (
                    <p className="text-muted-foreground px-2 pb-2 text-xs">{t("products_palette_no_products")}</p>
                  ) : (
                    <ProductList products={products} locale={locale} />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {orphanProducts.length > 0 ? (
            <AccordionItem value="__orphan__" className="border-b last:border-b-0">
              <AccordionTrigger className="py-3 text-xs hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Package className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-medium">{t("products_palette_orphan_title")}</span>
                  <span className="text-muted-foreground shrink-0 font-normal">
                    ({t("products_palette_product_count", { count: orphanProducts.length })})
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ProductList products={orphanProducts} locale={locale} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
