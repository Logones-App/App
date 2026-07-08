"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Entrée unique de création du catalogue : le rôle (à vendre / matière / les deux) se choisit dans le formulaire. */
export function CatalogEntryButtons({ base }: { base: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`${base}/new`}>Nouveau produit</Link>
    </Button>
  );
}
