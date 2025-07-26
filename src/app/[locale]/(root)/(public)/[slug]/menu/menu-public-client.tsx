"use client";
import Link from "next/link";
import { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UtensilsCrossed, Euro } from "lucide-react";

type Establishment = Tables<"establishments">;

interface MenuPublicClientProps {
  establishment: Establishment;
  locale: string;
}

export function MenuPublicClient({ establishment, locale }: MenuPublicClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header Public */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/${establishment.slug}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à l'accueil
                </Button>
              </Link>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{establishment.name}</h1>
                <p className="text-gray-600">Notre carte</p>
              </div>
            </div>
            <nav className="hidden items-center gap-6 md:flex">
              <Link href={`/${locale}/${establishment.slug}/menu`} className="font-semibold text-orange-600">
                Menu
              </Link>
              <Link
                href={`/${locale}/${establishment.slug}/reservations`}
                className="text-gray-700 hover:text-orange-600"
              >
                Réservations
              </Link>
              <Link href={`/${locale}/${establishment.slug}/contact`} className="text-gray-700 hover:text-orange-600">
                Contact
              </Link>
              <Link href={`/${locale}/${establishment.slug}/about`} className="text-gray-700 hover:text-orange-600">
                À propos
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Menu Section */}
      <section className="px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Notre Carte</h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              Découvrez nos plats préparés avec passion et des ingrédients frais
            </p>
          </div>

          {/* Menu Categories */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Entrées */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-orange-800">Entrées</CardTitle>
                <CardDescription>Pour commencer en douceur</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Salade César</h4>
                      <p className="text-sm text-gray-600">Laitue, parmesan, croûtons, sauce césar</p>
                    </div>
                    <span className="font-bold text-orange-600">12€</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Soupe à l'oignon</h4>
                      <p className="text-sm text-gray-600">Soupe traditionnelle gratinée</p>
                    </div>
                    <span className="font-bold text-orange-600">8€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plats */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-orange-800">Plats</CardTitle>
                <CardDescription>Nos spécialités</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Steak Frites</h4>
                      <p className="text-sm text-gray-600">Steak de bœuf, frites maison, sauce au poivre</p>
                    </div>
                    <span className="font-bold text-orange-600">24€</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Poulet Rôti</h4>
                      <p className="text-sm text-gray-600">Poulet fermier, légumes de saison</p>
                    </div>
                    <span className="font-bold text-orange-600">18€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desserts */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-orange-800">Desserts</CardTitle>
                <CardDescription>Pour finir en beauté</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Crème Brûlée</h4>
                      <p className="text-sm text-gray-600">Crème vanille, caramel croquant</p>
                    </div>
                    <span className="font-bold text-orange-600">7€</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Tarte Tatin</h4>
                      <p className="text-sm text-gray-600">Pommes caramélisées, crème fraîche</p>
                    </div>
                    <span className="font-bold text-orange-600">8€</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <p className="mb-6 text-lg text-gray-600">Envie de déguster nos plats ? Réservez votre table !</p>
            <Link href={`/${locale}/${establishment.slug}/reservations`}>
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                Réserver une table
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Public */}
      <footer className="bg-gray-900 px-4 py-8 text-white">
        <div className="container mx-auto">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 font-bold">{establishment.name}</h4>
              <p className="text-gray-400">{establishment.description}</p>
            </div>
            <div>
              <h4 className="mb-4 font-bold">Navigation</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href={`/${locale}/${establishment.slug}/menu`} className="hover:text-white">
                    Menu
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/${establishment.slug}/reservations`} className="hover:text-white">
                    Réservations
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/${establishment.slug}/contact`} className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/${establishment.slug}/about`} className="hover:text-white">
                    À propos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href={`/${locale}/${establishment.slug}/legal/privacy`} className="hover:text-white">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/${establishment.slug}/legal/terms`} className="hover:text-white">
                    Conditions
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold">Contact</h4>
              <div className="space-y-2 text-gray-400">
                {establishment.address && <p>{establishment.address}</p>}
                {establishment.phone && <p>{establishment.phone}</p>}
                {establishment.email && <p>{establishment.email}</p>}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 {establishment.name}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
