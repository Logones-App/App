"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

/**
 * Ancienne entrée de la route /categories : redirection vers /products (même chemin, dernier segment remplacé).
 */
export function CategoriesClient() {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const target = pathname.replace(/\/categories\/?($|\?)/, "/products$1");
    if (target !== pathname) {
      router.replace(target);
    }
  }, [pathname, router]);

  return (
    <div className="text-muted-foreground flex items-center justify-center p-8 text-sm">Redirection vers Produits…</div>
  );
}
