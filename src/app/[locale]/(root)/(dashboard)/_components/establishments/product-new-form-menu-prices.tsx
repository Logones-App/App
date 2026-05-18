"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MenuPricesCard({
  menus,
  menuPrices,
  setMenuPrices,
}: {
  menus: { id: string; name: string | null }[];
  menuPrices: Record<string, string>;
  setMenuPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix par menu</CardTitle>
        <CardDescription>
          Définissez le prix de vente pour chaque menu. Le produit n&apos;est pas encore ajouté à la grille — faites-le
          glisser depuis la palette quand vous le souhaitez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {menus.map((menu) => (
            <div key={menu.id} className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`menu-price-${menu.id}`}>
                {menu.name}
              </label>
              <Input
                id={`menu-price-${menu.id}`}
                value={menuPrices[menu.id] ?? ""}
                onChange={(e) => setMenuPrices((prev) => ({ ...prev, [menu.id]: e.target.value }))}
                type="text"
                inputMode="decimal"
                className="tabular-nums"
                placeholder="Prix de vente TTC"
              />
              <p className="text-muted-foreground text-xs">Vide = à définir depuis la fiche produit</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
