"use client";

import { useLocale } from "next-intl";

import { useMenuPaletteCatalog } from "@/lib/queries/establishments";

import {
  MenuPaletteSidebarEmptyCatalog,
  MenuPaletteSidebarError,
  MenuPaletteSidebarFullCatalog,
  MenuPaletteSidebarLoading,
  MenuPaletteSidebarOrphansOnly,
} from "./menu-palette-sidebar-views";

export function MenuPaletteSidebar({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const locale = useLocale();
  const { data, isLoading, isError, error } = useMenuPaletteCatalog(establishmentId, organizationId);

  if (isLoading) {
    return <MenuPaletteSidebarLoading />;
  }

  if (isError) {
    return <MenuPaletteSidebarError message={error instanceof Error ? error.message : undefined} />;
  }

  const categories = data?.categories ?? [];
  const byCat = data?.productsByCategoryId ?? {};
  const orphanProducts = data?.orphanProducts ?? [];

  const hasCategories = categories.length > 0;
  const totalListed = categories.reduce((n, cat) => n + (byCat[cat.id]?.length ?? 0), 0) + orphanProducts.length;

  if (!hasCategories && orphanProducts.length === 0) {
    return <MenuPaletteSidebarEmptyCatalog />;
  }

  if (!hasCategories) {
    return <MenuPaletteSidebarOrphansOnly orphanProducts={orphanProducts} locale={locale} />;
  }

  return (
    <MenuPaletteSidebarFullCatalog
      categories={categories}
      byCat={byCat}
      orphanProducts={orphanProducts}
      locale={locale}
      totalListed={totalListed}
    />
  );
}
