"use client";

import { useMemo, useState } from "react";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MenuPaletteCategory } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

import { DraggableCategoryStrip, PaletteSystemActionsSection, ProductList } from "./menu-palette-sidebar-widgets";

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
      <PaletteSystemActionsSection />
      <p className="text-muted-foreground p-4 text-xs">{t("products_palette_empty")}</p>
    </div>
  );
}

export function MenuPaletteSidebarCatalog({
  categories,
  products,
  priceByProductId,
  locale,
}: {
  categories: MenuPaletteCategory[];
  products: Tables<"products">[];
  priceByProductId: Record<string, number>;
  locale: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <Tabs defaultValue="catalogue" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="actions" className="text-xs">
          Actions
        </TabsTrigger>
        <TabsTrigger value="dossiers" className="text-xs">
          Dossiers
          {categories.length > 0 && <span className="ml-1 opacity-60">{categories.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="catalogue" className="text-xs">
          Catalogue
          <span className="ml-1 opacity-60">{products.length}</span>
        </TabsTrigger>
      </TabsList>

      {/* Actions système */}
      <TabsContent value="actions" className="mt-2">
        <div className="bg-muted/30 rounded-xl border">
          <PaletteSystemActionsSection className="border-b-0" />
        </div>
      </TabsContent>

      {/* Dossiers POS */}
      <TabsContent value="dossiers" className="mt-2">
        {categories.length === 0 ? (
          <p className="text-muted-foreground p-3 text-xs">Aucun dossier disponible.</p>
        ) : (
          <ScrollArea className="h-[538px] rounded-lg border">
            <div className="space-y-1.5 p-1">
              {categories.map((cat) => (
                <DraggableCategoryStrip key={cat.id} categoryId={cat.id} label={cat.name} />
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      {/* Catalogue produits */}
      <TabsContent value="catalogue" className="mt-2 space-y-2">
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="h-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-3 text-xs">{search ? "Aucun résultat." : "Aucun produit."}</p>
        ) : (
          <ScrollArea className="h-[498px] rounded-lg border">
            <div className="py-1 pr-3 pl-1">
              <ProductList products={filtered} priceByProductId={priceByProductId} locale={locale} />
            </div>
          </ScrollArea>
        )}
      </TabsContent>
    </Tabs>
  );
}
