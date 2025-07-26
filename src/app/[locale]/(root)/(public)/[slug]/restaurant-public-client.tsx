"use client";

import { Tables } from "@/lib/supabase/database.types";
import { RestaurantHeader } from "./_components/restaurant-header";
import { RestaurantHero } from "./_components/restaurant-hero";
import { RestaurantInfo } from "./_components/restaurant-info";
import { RestaurantFooter } from "./_components/restaurant-footer";

type Establishment = Tables<"establishments">;
type OpeningHours = Tables<"opening_hours">;

interface RestaurantPublicClientProps {
  establishment: Establishment;
  locale: string;
  openingHours?: OpeningHours[];
}

export function RestaurantPublicClient({ establishment, locale, openingHours = [] }: RestaurantPublicClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header Public */}
      <RestaurantHeader establishment={establishment} locale={locale} />

      {/* Hero Section */}
      <RestaurantHero establishment={establishment} locale={locale} />

      {/* Informations */}
      <RestaurantInfo establishment={establishment} />

      {/* Footer avec horaires */}
      <RestaurantFooter establishment={establishment} openingHours={openingHours} />
    </div>
  );
}
