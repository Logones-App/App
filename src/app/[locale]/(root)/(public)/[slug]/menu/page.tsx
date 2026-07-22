import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import MenuPublicClient from "./menu-public-client";

interface MenuPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { locale, slug } = await params;

  // Récupérer le restaurant par slug côté serveur
  const supabase = await createClient();
  // Garde d'existence uniquement (le contenu est chargé côté client) → un id suffit.
  // ⚠️ Pas de select("*") : anon n'a plus le privilège sur toutes les colonnes (cf. public-establishment-columns).
  const { data: establishment, error } = await supabase
    .from("establishments")
    .select("id")
    .eq("slug", slug)
    .eq("deleted", false)
    .single();

  if (error || !establishment) {
    notFound();
  }

  return <MenuPublicClient params={Promise.resolve({ slug, locale })} />;
}
