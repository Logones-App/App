import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { RestaurantPublicClient } from "./restaurant-public-client";

interface RestaurantPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { locale, slug } = await params;

  // Récupérer le restaurant par slug côté serveur
  const supabase = await createClient();
  const { data: establishment, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("slug", slug)
    .eq("deleted", false)
    .single();

  if (error || !establishment) {
    notFound();
  }

  // Récupérer les horaires d'ouverture
  const { data: openingHours } = await supabase
    .from("opening_hours")
    .select("*")
    .eq("establishment_id", establishment.id)
    .eq("deleted", false)
    .order("day_of_week");

  return <RestaurantPublicClient establishment={establishment} locale={locale} openingHours={openingHours ?? []} />;
}
