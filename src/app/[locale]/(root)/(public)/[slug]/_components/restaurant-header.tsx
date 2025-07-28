"use client";

import Link from "next/link";

import { UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/i18n";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface RestaurantHeaderProps {
  establishment: Establishment;
  locale: string;
}

export function RestaurantHeader({ establishment, locale }: RestaurantHeaderProps) {
  const t = useTranslations("restaurant_public.navigation");

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{establishment.name}</h1>
              <p className="text-gray-600">{establishment.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 md:flex">
              <Link href={`/${locale}/${establishment.slug}/menu`} className="text-gray-700 hover:text-orange-600">
                {t("menu")}
              </Link>
              <Link href={`/${locale}/${establishment.slug}/booking`} className="text-gray-700 hover:text-orange-600">
                {t("booking")}
              </Link>
              <Link href={`/${locale}/${establishment.slug}/contact`} className="text-gray-700 hover:text-orange-600">
                {t("contact")}
              </Link>
              <Link href={`/${locale}/${establishment.slug}/about`} className="text-gray-700 hover:text-orange-600">
                {t("about")}
              </Link>
            </nav>
            <LanguageSwitcher variant="dropdown" size="sm" />
            {/* Alternative avec boutons : */}
            {/* <LanguageSwitcher variant="buttons" size="sm" /> */}
          </div>
        </div>
      </div>
    </header>
  );
}
