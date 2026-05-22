"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEstablishmentMenus } from "@/lib/queries/establishments";

import type { WizardData } from "./product-new-wizard";

export function Step2Prix({
  data,
  patch,
  establishmentId,
  organizationId,
}: {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  establishmentId: string;
  organizationId: string;
}) {
  const { data: menus = [] } = useEstablishmentMenus(establishmentId, organizationId);

  const setPrice = (menuId: string, value: string) => {
    patch({ menu_prices: { ...data.menu_prices, [menuId]: value } });
  };

  if (menus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prix par menu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucun menu actif pour cet établissement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix par menu</CardTitle>
        <CardDescription>Prix de vente TTC pour chaque menu. Vide = à définir depuis la fiche produit.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {menus.map((menu) => (
            <div key={menu.id} className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`menu-price-${menu.id}`}>
                {menu.name}
              </label>
              <div className="relative">
                <Input
                  id={`menu-price-${menu.id}`}
                  value={Object.hasOwn(data.menu_prices, menu.id) ? data.menu_prices[menu.id] : ""}
                  onChange={(e) => setPrice(menu.id, e.target.value)}
                  inputMode="decimal"
                  className="pr-8 tabular-nums"
                  placeholder="0,00"
                />
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
