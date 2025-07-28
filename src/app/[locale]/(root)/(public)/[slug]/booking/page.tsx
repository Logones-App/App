"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { Calendar, ArrowLeft, Clock, Users, MapPin, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Value = Date | undefined;

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
  }>;
}

type Establishment = Tables<"establishments">;

// Fonction pour récupérer l'établissement par slug
async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  try {
    console.log("🔍 Recherche de l'établissement avec le slug:", slug);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("establishments")
      .select(
        `
        id,
        name,
        slug,
        description,
        address,
        phone,
        email,
        logo_url,
        cover_image_url,
        website,
        is_public,
        created_at,
        updated_at,
        deleted
      `,
      )
      .eq("slug", slug)
      .eq("deleted", false)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération de l'établissement:", error);
      return null;
    }

    if (!data) {
      console.log("⚠️ Aucun établissement trouvé avec le slug:", slug);
      return null;
    }

    // Vérifier si l'établissement est public
    if (data.is_public !== true) {
      console.log("🚫 Établissement non public:", data.name);
      return null;
    }

    console.log("✅ Établissement trouvé:", data.name);
    return data as Establishment;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération de l'établissement:", error);
    return null;
  }
}

export default function BookingPage({ params }: BookingPageProps) {
  const router = useRouter();
  const t = useTranslations();
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEstablishment() {
      try {
        const resolvedParams = await params;
        const establishmentSlug =
          resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug;

        if (!establishmentSlug) {
          console.error("❌ Slug manquant");
          return;
        }

        const establishmentData = await getEstablishmentBySlug(establishmentSlug);
        setEstablishment(establishmentData);
      } catch (error) {
        console.error("❌ Erreur lors du chargement de l'établissement:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEstablishment();
  }, [params]);

  // Fonction pour formater la date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fonction pour naviguer vers les créneaux
  const handleDateSelect = (date: Date) => {
    if (!establishment) return;

    // Utiliser format() de date-fns pour éviter le décalage UTC
    const formattedDate = format(date, "yyyy-MM-dd");
    const targetUrl = `/${establishment.slug}/booking/slots/${formattedDate}`;

    console.log("🚀 Navigation vers les créneaux:");
    console.log("  - Date sélectionnée:", date);
    console.log("  - Date formatée:", formattedDate);
    console.log("  - URL cible:", targetUrl);

    router.push(targetUrl);
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-4">{t("page.loading")}</p>
        </div>
      </div>
    );
  }

  // Afficher une erreur si l'établissement n'est pas trouvé
  if (!establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-destructive mb-4 text-2xl font-bold">{t("page.not_found.title")}</h1>
          <p className="text-muted-foreground mb-4">{t("page.not_found.description")}</p>
          <Link href="/">
            <Button>{t("page.not_found.back_home")}</Button>
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
                  {t("page.back")}
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {t("page.title")} - {establishment.name}
                </h1>
                <p className="text-sm text-gray-500">{t("page.subtitle")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Informations de l'établissement */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="text-primary h-5 w-5" />
                  {establishment.name}
                </CardTitle>
                <CardDescription>{establishment.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{establishment.address}</span>
                </div>
                {establishment.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{establishment.phone}</span>
                  </div>
                )}
                {establishment.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{establishment.email}</span>
                  </div>
                )}
                {establishment.website && (
                  <div className="pt-2">
                    <a
                      href={establishment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      {t("page.establishment_info.visit_website")}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendrier de réservation */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-primary h-5 w-5" />
                  {t("page.calendar.title")}
                </CardTitle>
                <CardDescription>{t("page.calendar.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Calendrier */}
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border shadow-sm"
                      disabled={(date) => {
                        // Désactiver les dates passées
                        return date < new Date(new Date().setHours(0, 0, 0, 0));
                      }}
                    />
                  </div>

                  {/* Date sélectionnée */}
                  {selectedDate && (
                    <div className="space-y-4 text-center">
                      <div className="bg-primary/5 rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">{t("page.calendar.selected_date")}</p>
                        <p className="text-primary text-lg font-semibold">{formatDate(selectedDate)}</p>
                      </div>

                      {/* Bouton pour continuer */}
                      <Button onClick={() => handleDateSelect(selectedDate)} className="w-full" size="lg">
                        <Clock className="mr-2 h-4 w-4" />
                        {t("page.calendar.continue_button")}
                      </Button>
                    </div>
                  )}

                  {/* Informations supplémentaires */}
                  <div className="bg-muted/30 mt-8 space-y-4 rounded-lg p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{t("page.info.max_guests")}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{t("page.info.min_advance")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bouton retour */}
            <div className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <Link href={`/${establishment.slug}`}>
                    <Button variant="outline" className="w-full">
                      ← {t("page.back_to_establishment")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
