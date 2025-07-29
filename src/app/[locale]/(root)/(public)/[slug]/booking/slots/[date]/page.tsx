"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ArrowLeft, Clock, MapPin, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// Import des composants extraits
import { getEstablishmentBySlug } from "../../_components/database-utils";
import { EstablishmentInfo } from "../../_components/establishment-info";
import { SlotsLoadingState, ErrorState } from "../../_components/loading-states";
import { DateInfo, SelectedSlotDisplay } from "../../_components/slots-components";

// Import du hook realtime et du composant d'affichage
import { useSlotsWithExceptions } from "@/hooks/use-slots-with-exceptions";
import { RealtimeSlotsDisplay } from "@/components/realtime-slots-display";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId?: string;
}

interface ServiceGroup {
  serviceName: string;
  slots: TimeSlot[];
}

type Establishment = Tables<"establishments">;

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
    date: string;
  }>;
}

export default function BookingSlotsPage({ params }: BookingPageProps) {
  const router = useRouter();
  const t = useTranslations("Booking.slots");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook realtime pour les créneaux avec exceptions
  const {
    serviceGroups,
    isLoading: slotsLoading,
    error: slotsError,
    refresh: refreshSlots,
    exceptions,
  } = useSlotsWithExceptions({
    establishmentId: establishment?.id ?? "",
    date: selectedDate ?? new Date(),
    enabled: !!establishment?.id && !!selectedDate,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const establishmentSlug =
          resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug;

        if (!establishmentSlug) {
          console.error("❌ Slug manquant");
          return;
        }

        // Récupérer la date depuis les paramètres
        const dateParam = resolvedParams.date;
        console.log("🔍 Date dans les paramètres:", dateParam);

        if (!dateParam) {
          // Rediriger automatiquement vers la page de sélection de date
          console.log("❌ Date manquante, redirection vers la sélection de date");
          router.push(`/${establishmentSlug}/booking`);
          return;
        }

        const date = parseISO(dateParam);
        console.log("✅ Date parsée:", date);
        setSelectedDate(date);

        // Récupérer l'établissement
        const establishmentData = await getEstablishmentBySlug(establishmentSlug);
        setEstablishment(establishmentData);
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  // Fonction pour formater la date
  const formatDate = (date: Date) => {
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  // Fonction pour continuer vers la confirmation
  const handleContinue = () => {
    if (!establishment || !selectedSlot || !selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const queryParams = new URLSearchParams({
      date: formattedDate,
      time: selectedSlot.time,
    });

    router.push(`/${establishment.slug}/booking/confirm?${queryParams.toString()}`);
  };

  // Afficher un loader pendant le chargement initial
  if (loading) {
    return <SlotsLoadingState />;
  }

  // Afficher une erreur si l'établissement n'est pas trouvé ou si la date est absente
  if (!establishment || !selectedDate) {
    return <ErrorState establishmentSlug={establishment?.slug} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/${establishment.slug}/booking`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t("back")}
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {t("title")} - {establishment.name}
                </h1>
                <p className="text-sm text-gray-500">{formatDate(selectedDate)}</p>
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
            <EstablishmentInfo establishment={establishment} />
            <DateInfo selectedDate={selectedDate} />

            {/* Debug: Affichage des exceptions (optionnel) */}
            {exceptions && exceptions.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Exceptions actives</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exceptions.map((exception) => (
                      <div key={exception.id} className="text-muted-foreground text-xs">
                        {exception.exception_type}: {exception.reason}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grille des créneaux avec realtime */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="text-primary h-5 w-5" />
                  Créneaux disponibles
                  {slotsLoading && (
                    <Badge variant="secondary" className="ml-2">
                      Mise à jour...
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Sélectionnez l&apos;heure de votre réservation
                  {exceptions && exceptions.length > 0 && (
                    <span className="ml-2 text-orange-600">
                      • {exceptions.length} exception{exceptions.length > 1 ? "s" : ""} active
                      {exceptions.length > 1 ? "s" : ""}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Composant d'affichage realtime */}
                <RealtimeSlotsDisplay
                  serviceGroups={serviceGroups}
                  selectedSlot={selectedSlot}
                  setSelectedSlot={setSelectedSlot}
                  isLoading={slotsLoading}
                  error={slotsError}
                  onRefresh={refreshSlots}
                />

                {/* Créneau sélectionné */}
                {selectedSlot && <SelectedSlotDisplay selectedSlot={selectedSlot} />}

                {/* Bouton continuer */}
                {selectedSlot && (
                  <div className="mt-6">
                    <Button onClick={handleContinue} className="w-full" size="lg">
                      Continuer vers la réservation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bouton retour */}
            <div className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <Link href={`/${establishment.slug}/booking`}>
                    <Button variant="outline" className="w-full">
                      ← Changer de date
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
