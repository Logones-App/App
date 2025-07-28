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
import { DateInfo, GroupedSlotsDisplay, SelectedSlotDisplay } from "../../_components/slots-components";

interface TimeSlot {
  time: string;
  available: boolean;
  label: string;
  status?: string;
  statusDisplay?: string;
  serviceName?: string;
  slotId?: string;
  availableCapacity?: number;
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

// Fonction pour récupérer les créneaux disponibles depuis l'API
const getAvailableSlots = async (establishmentId: string, date: Date): Promise<TimeSlot[]> => {
  try {
    const formattedDate = format(date, "yyyy-MM-dd");
    console.log("🔍 Récupération des créneaux pour:", formattedDate);

    // Appeler l'API Route
    const response = await fetch(`/api/booking/slots?establishmentId=${establishmentId}&date=${formattedDate}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ Erreur lors de la récupération des créneaux:", response.status);
      console.log("🔄 Aucun créneau configuré...");
      return [];
    }

    const data = await response.json();
    const timeSlots = data.timeSlots;

    // Si aucun créneau trouvé, retourner une liste vide
    if (!timeSlots || timeSlots.length === 0) {
      console.log("📝 Aucun créneau configuré pour cet établissement");
      return [];
    }

    console.log("✅ Créneaux récupérés:", timeSlots.length);
    console.log("📊 Structure du premier service:", timeSlots[0]);

    // Convertir les créneaux groupés en TimeSlot[]
    const slots: TimeSlot[] = [];
    timeSlots.forEach(
      (serviceGroup: {
        slots: Array<{ time: string; isAvailable: boolean; maxCapacity: number; slotId?: string }>;
        serviceName: string;
      }) => {
        serviceGroup.slots.forEach((slot) => {
          slots.push({
            time: slot.time,
            available: slot.isAvailable,
            label: slot.time,
            status: slot.isAvailable ? "available" : "unavailable",
            statusDisplay: slot.isAvailable ? "Disponible" : "Indisponible",
            serviceName: serviceGroup.serviceName,
            slotId: slot.slotId,
            availableCapacity: slot.maxCapacity,
          });
        });
      },
    );

    return slots;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération des créneaux:", error);
    return [];
  }
};

export default function BookingSlotsPage({ params }: BookingPageProps) {
  const router = useRouter();
  const t = useTranslations("Booking.slots");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Récupérer les créneaux depuis la base de données
        if (establishmentData) {
          const slots = await getAvailableSlots(establishmentData.id, date);
          setTimeSlots(slots);
        }
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

  // Afficher un loader pendant le chargement
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
          </div>

          {/* Grille des créneaux */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="text-primary h-5 w-5" />
                  Créneaux disponibles
                </CardTitle>
                <CardDescription>Sélectionnez l&apos;heure de votre réservation</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vérifier s'il y a des créneaux disponibles */}
                {timeSlots.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                      <Clock className="text-muted-foreground h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Pas de créneaux disponibles</h3>
                    <p className="text-muted-foreground">Aucun créneau n&apos;est configuré pour cette date.</p>
                  </div>
                ) : (
                  <GroupedSlotsDisplay
                    timeSlots={timeSlots}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                  />
                )}

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
