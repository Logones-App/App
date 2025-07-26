import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuPublicClient } from "./menu-public-client";

interface MenuPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
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

  return <MenuPublicClient establishment={establishment} locale={locale} />;
}
