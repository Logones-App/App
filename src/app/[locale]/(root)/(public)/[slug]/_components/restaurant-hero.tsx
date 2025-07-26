"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Calendar } from "lucide-react";

type Establishment = Tables<"establishments">;

interface RestaurantHeroProps {
  establishment: Establishment;
  locale: string;
}

export function RestaurantHero({ establishment, locale }: RestaurantHeroProps) {
  const t = useTranslations("restaurant_public.hero");

  return (
    <section className="px-4 py-16">
      <div className="container mx-auto text-center">
        <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
          {t("welcome", { name: establishment.name })}
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
          {establishment.description || t("default_description")}
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href={`/${locale}/${establishment.slug}/menu`}>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              <UtensilsCrossed className="mr-2 h-5 w-5" />
              {t("view_menu")}
            </Button>
          </Link>
          <Link href={`/${locale}/${establishment.slug}/reservations`}>
            <Button size="lg" variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50">
              <Calendar className="mr-2 h-5 w-5" />
              {t("book_table")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
