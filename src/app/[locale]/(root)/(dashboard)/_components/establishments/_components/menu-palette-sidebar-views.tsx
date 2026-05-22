"use client";

import { useMemo, useState } from "react";

import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MenuPaletteCategory } from "@/lib/queries/establishments";
import type { Tables } from "@/lib/supabase/database.types";

import { DraggableCategoryStrip, PaletteSystemActionsSection, ProductList } from "./menu-palette-sidebar-widgets";

function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-muted/30 rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-t-xl px-3 py-2.5 text-left transition-colors"
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <span className="flex-1 text-xs font-medium">{title}</span>
        {badge && <span className="text-muted-foreground text-[10px]">{badge}</span>}
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

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
    <CollapsibleSection title={t("products_palette_actions_title")}>
      <PaletteSystemActionsSection className="border-b-0" />
      <p className="text-muted-foreground border-t p-4 text-xs">{t("products_palette_empty")}</p>
    </CollapsibleSection>
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
  const t = useTranslations("establishments.menus_page");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="space-y-2">
      {/* Recherche */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Actions système — masquées si recherche active */}
      {!search && (
        <CollapsibleSection title={t("products_palette_actions_title")} defaultOpen={false}>
          <PaletteSystemActionsSection className="border-b-0" />
        </CollapsibleSection>
      )}

      {/* Catégories (dossiers POS) — masquées si recherche active */}
      {!search && categories.length > 0 && (
        <CollapsibleSection
          title={t("products_palette_categories_title")}
          badge={`${categories.length}`}
          defaultOpen={true}
        >
          <ScrollArea className="max-h-44">
            <div className="space-y-1.5 p-2">
              {categories.map((cat) => (
                <DraggableCategoryStrip key={cat.id} categoryId={cat.id} label={cat.name} />
              ))}
            </div>
          </ScrollArea>
        </CollapsibleSection>
      )}

      {/* Produits */}
      <CollapsibleSection
        title={t("products_sidebar_title")}
        badge={filtered.length !== products.length ? `${filtered.length}/${products.length}` : `${products.length}`}
        defaultOpen={true}
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-4 text-xs">
            {search ? "Aucun résultat." : t("products_palette_empty")}
          </p>
        ) : (
          <ScrollArea className="max-h-[min(50vh,440px)]">
            <div className="p-2">
              <ProductList products={filtered} priceByProductId={priceByProductId} locale={locale} />
            </div>
          </ScrollArea>
        )}
      </CollapsibleSection>
    </div>
  );
}
