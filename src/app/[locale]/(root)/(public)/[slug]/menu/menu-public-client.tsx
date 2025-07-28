"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";

import { ArrowLeft, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

// Import des composants extraits
import { MenuDisplay } from "./_components/menu-components";
import { getEstablishmentBySlug, getEstablishmentMenu, type MenuItemWithDetails } from "./_components/menu-utils";

type Establishment = Tables<"establishments">;

interface MenuPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
  }>;
}

export default function MenuPublicClient({ params }: MenuPageProps) {
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItemWithDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const establishmentSlug =
          resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug;

        if (!establishmentSlug) {
          console.error("❌ Slug manquant");
          setError("Slug d'établissement manquant");
          return;
        }

        // Récupérer l'établissement
        const establishmentData = await getEstablishmentBySlug(establishmentSlug);
        if (!establishmentData) {
          setError("Établissement non trouvé");
          return;
        }

        setEstablishment(establishmentData);

        // Récupérer le menu
        const menuData = await getEstablishmentMenu(establishmentData.id);
        setCategories(menuData.categories);
        setItemsByCategory(menuData.itemsByCategory);
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
        setError("Erreur lors du chargement du menu");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-4">Chargement du menu...</p>
        </div>
      </div>
    );
  }

  // Afficher une erreur si l'établissement n'est pas trouvé
  if (error || !establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-destructive mb-4 text-2xl font-bold">Erreur</h1>
          <p className="text-muted-foreground mb-4">{error ?? "Impossible de charger le menu."}</p>
          <Link href={`/${establishment?.slug ?? ""}`}>
            <Button>Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/${establishment.slug}`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Menu - {establishment.name}</h1>
                <p className="text-sm text-gray-500">Découvrez notre carte</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Informations de l'établissement */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="text-primary h-5 w-5" />
              {establishment.name}
            </CardTitle>
            <CardDescription>{establishment.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Adresse :</span>
                <span>{establishment.address}</span>
              </div>
              {establishment.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Téléphone :</span>
                  <span>{establishment.phone}</span>
                </div>
              )}
              {establishment.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Email :</span>
                  <span>{establishment.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Menu */}
        {categories.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <UtensilsCrossed className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Menu non disponible</h3>
              <p className="text-muted-foreground">Le menu de cet établissement n&apos;est pas encore configuré.</p>
            </CardContent>
          </Card>
        ) : (
          <MenuDisplay categories={categories} itemsByCategory={itemsByCategory} />
        )}

        {/* Bouton retour */}
        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <Link href={`/${establishment.slug}`}>
                <Button variant="outline" className="w-full">
                  ← Retour à l&apos;accueil
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
