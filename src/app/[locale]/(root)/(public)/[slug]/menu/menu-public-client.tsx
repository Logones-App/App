"use client";

import React, { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, MapPin, Phone, UtensilsCrossed } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CategorySection } from "./_components/menu-components";
import {
  getPublicEstablishmentBySlug,
  getPublicMenus,
  type PublicEstablishment,
  type PublicMenu,
} from "./_components/menu-utils";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export default function MenuPublicClient({ params }: Props) {
  const [establishment, setEstablishment] = useState<PublicEstablishment | null>(null);
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then(async ({ slug }) => {
      const estab = await getPublicEstablishmentBySlug(slug);
      if (!estab) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEstablishment(estab);
      const menuData = await getPublicMenus(estab.id);
      setMenus(menuData);
      setLoading(false);
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Chargement du menu…</p>
        </div>
      </div>
    );
  }

  if (notFound || !establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <UtensilsCrossed className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h1 className="mb-2 text-xl font-bold">Menu non disponible</h1>
          <p className="text-muted-foreground text-sm">Cet établissement n&apos;est pas public ou n&apos;existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/95 shadow-sm backdrop-blur dark:bg-gray-900/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            href={`/${establishment.slug}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex-1 truncate">
            <h1 className="truncate font-semibold">{establishment.name}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Infos établissement */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{establishment.name}</h2>
          {establishment.description && (
            <p className="text-muted-foreground mt-1 text-sm">{establishment.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4">
            {establishment.address && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {establishment.address}
              </span>
            )}
            {establishment.phone && (
              <a
                href={`tel:${establishment.phone}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
              >
                <Phone className="h-3.5 w-3.5" />
                {establishment.phone}
              </a>
            )}
          </div>
        </div>

        {/* Menus */}
        {menus.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <UtensilsCrossed className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <h3 className="font-semibold">Menu non configuré</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Le menu de cet établissement n&apos;est pas encore disponible.
            </p>
          </div>
        ) : menus.length === 1 ? (
          // Un seul menu — affichage direct
          <MenuContent menu={menus[0]} />
        ) : (
          // Plusieurs menus — onglets
          <Tabs defaultValue={menus[0].id}>
            <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
              {menus.map((m) => (
                <TabsTrigger key={m.id} value={m.id} className="text-sm">
                  {m.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {menus.map((m) => (
              <TabsContent key={m.id} value={m.id}>
                <MenuContent menu={m} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Légende allergènes */}
        {menus.some((m) =>
          Object.values(m.productsByCategory).some((ps) => ps.some((p) => p.allergens.length > 0)),
        ) && (
          <p className="text-muted-foreground mt-8 text-center text-xs">
            Les allergènes sont indiqués en rouge sur chaque plat. En cas de doute, demandez à notre équipe.
          </p>
        )}
      </main>
    </div>
  );
}

function MenuContent({ menu }: { menu: PublicMenu }) {
  const totalProducts = Object.values(menu.productsByCategory).reduce((s, ps) => s + ps.length, 0);

  if (totalProducts === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">Aucun plat disponible pour ce menu.</p>
      </div>
    );
  }

  return (
    <div>
      {menu.description && <p className="text-muted-foreground mb-6 text-sm">{menu.description}</p>}
      {menu.categories.map((cat) => (
        <CategorySection key={cat.id} name={cat.name} products={menu.productsByCategory[cat.id] ?? []} />
      ))}
    </div>
  );
}
