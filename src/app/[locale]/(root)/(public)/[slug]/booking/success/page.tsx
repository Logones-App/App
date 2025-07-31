"use client";

import React, { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { CheckCircle, ArrowLeft, Calendar, Clock, Users, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";
import { Tables } from "@/lib/supabase/database.types";

import { EstablishmentInfo } from "../_components/establishment-info";
import { LoadingState, ErrorState } from "../_components/loading-states";

type Establishment = Tables<"establishments">;

interface BookingSuccessPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
  }>;
}

export default function BookingSuccessPage({ params }: BookingSuccessPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Booking.success");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [bookingData, setBookingData] = useState<any>(null);

  // Récupérer les données de réservation depuis le store ou les paramètres
  const { getConfirmationData } = useBookingConfirmationStore();

  // Fonction pour extraire le slug de l'établissement
  const getEstablishmentSlug = (resolvedParams: any): string | null => {
    return resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug ?? null;
  };

  // Fonction pour récupérer l'établissement depuis Supabase
  const fetchEstablishment = async (establishmentSlug: string): Promise<Establishment | null> => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: establishmentData, error: establishmentError } = await supabase
      .from("establishments")
      .select("*")
      .eq("slug", establishmentSlug)
      .eq("deleted", false)
      .single();

    if (establishmentError || !establishmentData) {
      console.error("❌ Erreur établissement:", establishmentError);
      return null;
    }

    return establishmentData;
  };

  // Fonction pour créer les données de réservation depuis le store
  const createBookingDataFromStore = (bookingConfirmation: any) => {
    return {
      id: bookingConfirmation.id,
      date: bookingConfirmation.date,
      time: bookingConfirmation.time,
      guests: bookingConfirmation.number_of_guests,
      customerName: `${bookingConfirmation.customer_first_name} ${bookingConfirmation.customer_last_name}`,
      email: bookingConfirmation.customer_email,
      phone: bookingConfirmation.customer_phone,
    };
  };

  // Fonction pour créer les données de réservation depuis les paramètres
  const createBookingDataFromParams = (
    booking: any,
    bookingDate: string | null,
    bookingTime: string | null,
    guests: string | null,
  ) => {
    return {
      id: booking.id,
      date: bookingDate ?? booking.date,
      time: bookingTime ?? booking.time,
      guests: guests ?? booking.number_of_guests,
      customerName: `${booking.customer_first_name} ${booking.customer_last_name}`,
      email: booking.customer_email,
      phone: booking.customer_phone,
    };
  };

  // Fonction pour récupérer les données de réservation depuis la base de données
  const fetchBookingFromDatabase = async (
    bookingId: string,
    bookingDate: string | null,
    bookingTime: string | null,
    guests: string | null,
  ) => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return null;
    }

    return createBookingDataFromParams(booking, bookingDate, bookingTime, guests);
  };

  // Fonction pour traiter les données de réservation
  const processBookingData = async () => {
    const bookingId = searchParams.get("bookingId");
    const bookingDate = searchParams.get("date");
    const bookingTime = searchParams.get("time");
    const guests = searchParams.get("guests");

    const bookingConfirmation = getConfirmationData();
    if (bookingConfirmation) {
      setBookingData(createBookingDataFromStore(bookingConfirmation));
      return;
    }

    if (bookingId) {
      const bookingDataFromDb = await fetchBookingFromDatabase(bookingId, bookingDate, bookingTime, guests);
      if (bookingDataFromDb) {
        setBookingData(bookingDataFromDb);
      }
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const establishmentSlug = getEstablishmentSlug(resolvedParams);

        if (!establishmentSlug) {
          console.error("❌ Slug manquant");
          setError("Établissement non trouvé");
          setLoading(false);
          return;
        }

        const establishmentData = await fetchEstablishment(establishmentSlug);
        if (!establishmentData) {
          setError("Établissement non trouvé");
          setLoading(false);
          return;
        }

        setEstablishment(establishmentData);
        await processBookingData();
        setLoading(false);
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
        setError("Erreur lors du chargement");
        setLoading(false);
      }
    }

    loadData();
  }, [params, searchParams, getConfirmationData]);

  if (loading) {
    return <LoadingState message="Chargement de la confirmation..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!establishment) {
    return <ErrorState message="Établissement non trouvé" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>

        {/* Informations de l'établissement */}
        <EstablishmentInfo establishment={establishment} />

        {/* Détails de la réservation */}
        {bookingData && (
          <Card className="mx-auto mt-8 max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("booking_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {t("date")}: {bookingData.date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {t("time")}: {bookingData.time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {t("guests")}: {bookingData.guests} {t("people")}
                </span>
              </div>
              {bookingData.customerName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {t("name")}: {bookingData.customerName}
                  </span>
                </div>
              )}
              {bookingData.email && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {t("email")}: {bookingData.email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Message de confirmation */}
        <Card className="mx-auto mt-6 max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <p className="text-gray-700">{t("confirmation_message")}</p>
              <p className="text-sm text-gray-500">{t("email_sent")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${establishment.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back_to_restaurant")}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/${establishment.slug}/booking`}>{t("new_booking")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
