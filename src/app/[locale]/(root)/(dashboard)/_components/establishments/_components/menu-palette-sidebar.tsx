"use client";

import { useLocale } from "next-intl";

import { useMenuPaletteCatalog } from "@/lib/queries/establishments";

import {
  MenuPaletteSidebarCatalog,
  MenuPaletteSidebarEmptyCatalog,
  MenuPaletteSidebarError,
  MenuPaletteSidebarLoading,
} from "./menu-palette-sidebar-views";

export function MenuPaletteSidebar({
  menuId,
  establishmentId,
  organizationId,
}: {
  menuId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const locale = useLocale();
  const { data, isLoading, isError, error } = useMenuPaletteCatalog(establishmentId, organizationId, menuId);

  if (isLoading) return <MenuPaletteSidebarLoading />;
  if (isError) return <MenuPaletteSidebarError message={error instanceof Error ? error.message : undefined} />;

  const categories = data?.categories ?? [];
  const products = data?.products ?? [];
  const priceByProductId = data?.priceByProductId ?? {};

  if (categories.length === 0 && products.length === 0) {
    return <MenuPaletteSidebarEmptyCatalog />;
  }

  return (
    <MenuPaletteSidebarCatalog
      categories={categories}
      products={products}
      priceByProductId={priceByProductId}
      locale={locale}
      establishmentId={establishmentId}
      organizationId={organizationId}
    />
  );
}
