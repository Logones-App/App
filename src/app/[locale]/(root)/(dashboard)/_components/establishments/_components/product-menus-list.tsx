"use client";

import type { Tables } from "@/lib/supabase/database.types";

interface ProductMenusListProps {
  menus: Tables<"menus">[];
}

export function ProductMenusList({ menus }: ProductMenusListProps) {
  // Pour l'instant, on affiche tous les menus car la relation products-menus n'est pas disponible
  const productMenus = menus;

  if (productMenus.length === 0) {
    return <p className="text-muted-foreground text-xs">Aucun menu disponible.</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {productMenus.map((menu) => (
        <div key={menu.id} className="bg-muted/30 flex items-center gap-4 rounded border p-2">
          <div className="flex-1">
            <div className="font-medium">{menu.name}</div>
            {menu.description && <div className="text-muted-foreground text-xs">{menu.description}</div>}
          </div>
          <div className="text-xs">
            {menu.is_active ? (
              <span className="text-green-600">Actif</span>
            ) : (
              <span className="text-muted-foreground">Inactif</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
