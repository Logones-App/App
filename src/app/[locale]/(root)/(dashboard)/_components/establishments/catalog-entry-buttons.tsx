"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Deux entrées de création du catalogue : ingrédient (matière) et produit (à vendre). */
export function CatalogEntryButtons({ base }: { base: string }) {
  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href={`${base}/new?type=ingredient`}>Nouvel ingrédient</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`${base}/new`}>Nouveau produit</Link>
      </Button>
    </>
  );
}
