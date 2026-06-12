"use client";

import React, { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { CheckCircle, ArrowLeft, Calendar, Clock, Users, Mail, Phone, User, Hash } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";
import { Tables } from "@/lib/supabase/database.types";

import { EstablishmentInfo } from "../_components/establishment-info";
import { LoadingState, ErrorState } from "../_components/loading-states";

import {
  getEstablishmentSlug,
  fetchEstablishment,
  createBookingDataFromStore,
  fetchBookingFromSecureApi,
} from "./utils";

type Establishment = Tables<"establishments">;

interface BookingData {
  id?: string;
  date: string;
  time: string;
  guests: number | string;
  customerName?: string;
  email?: string;
  phone?: string;
}

interface BookingSuccessPageProps {
  params: Promise<{
    slug?: string;
    locale: string;
  }>;
}

const SuccessHeader = ({ t }: { t: ReturnType<typeof useTranslations> }) => (
  <div className="mb-8 text-center">
    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
      <CheckCircle className="h-12 w-12 text-green-600" />
    </div>
    <h1 className="mb-3 text-4xl font-bold text-gray-900">{t("title")}</h1>
    <p className="text-lg text-gray-600">{t("subtitle")}</p>
    <div className="mt-4 inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
      <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
      Réservation confirmée
    </div>
  </div>
);

const BookingDetails = ({ bookingData }: { bookingData: BookingData }) => (
  <Card className="h-fit">
    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardTitle className="flex items-center gap-2 text-blue-900">
        <Calendar className="h-5 w-5" />
        Détails de la réservation
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 pt-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Date</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(bookingData.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Heure</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{bookingData.time}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">Nombre de personnes</span>
        </div>
        <p className="text-lg font-semibold text-gray-900">
          {bookingData.guests} {Number(bookingData.guests) > 1 ? "personnes" : "personne"}
        </p>
      </div>
      {bookingData.id && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Numéro de réservation</span>
          </div>
          <p className="rounded bg-gray-100 px-3 py-1 font-mono text-sm text-gray-600">#{bookingData.id}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const CustomerInfo = ({ bookingData }: { bookingData: BookingData }) => (
  <Card className="h-fit">
    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
      <CardTitle className="flex items-center gap-2 text-green-900">
        <Users className="h-5 w-5" />
        Vos informations
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 pt-6">
      {bookingData.customerName && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Nom complet</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{bookingData.customerName}</p>
        </div>
      )}
      {bookingData.email && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Email</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{bookingData.email}</p>
        </div>
      )}
      {bookingData.phone && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Téléphone</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{bookingData.phone}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const InfoMessages = () => (
  <div className="mt-8 grid gap-4 md:grid-cols-2">
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
          <div>
            <h3 className="font-semibold text-gray-900">Confirmation par email</h3>
            <p className="mt-1 text-sm text-gray-600">
              Un email de confirmation a été envoyé à votre adresse email avec tous les détails de votre réservation.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-green-500">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
          <div>
            <h3 className="font-semibold text-gray-900">Modification ou annulation</h3>
            <p className="mt-1 text-sm text-gray-600">
              Pour modifier ou annuler votre réservation, contactez directement l&apos;établissement.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ActionButtons = ({ establishment }: { establishment: Establishment }) => (
  <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
    <Button asChild variant="outline" size="lg">
      <Link href={`/${establishment.slug}`}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au restaurant
      </Link>
    </Button>
    <Button asChild size="lg">
      <Link href={`/${establishment.slug}/booking`}>Nouvelle réservation</Link>
    </Button>
  </div>
);

export default function BookingSuccessPage({ params }: BookingSuccessPageProps) {
  const searchParams = useSearchParams();
  const t = useTranslations("Booking.success");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  const { getConfirmationData } = useBookingConfirmationStore();

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const establishmentSlug = getEstablishmentSlug(resolvedParams);

        if (!establishmentSlug) {
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

        // Récupération des données de réservation
        const bookingId = searchParams.get("bookingId");

        const isCustomDomain =
          window.location.hostname !== "logones.fr" &&
          window.location.hostname !== "localhost" &&
          !window.location.hostname.includes("127.0.0.1");

        if (isCustomDomain && bookingId) {
          const data = await fetchBookingFromSecureApi(bookingId);
          if (data) {
            setBookingData(data);
            setLoading(false);
            return;
          }
        }

        const storeData = getConfirmationData();
        if (storeData) {
          setBookingData(createBookingDataFromStore(storeData));
          setLoading(false);
          return;
        }

        if (bookingId) {
          const data = await fetchBookingFromSecureApi(bookingId);
          if (data) setBookingData(data);
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement");
        setLoading(false);
      }
    }

    loadData();
  }, [params, searchParams, getConfirmationData]);

  if (loading) return <LoadingState message="Chargement de la confirmation..." />;
  if (error) return <ErrorState message={error} />;
  if (!establishment) return <ErrorState message="Établissement non trouvé" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <SuccessHeader t={t} />

        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <EstablishmentInfo establishment={establishment} />
          </div>

          {bookingData && (
            <div className="grid gap-6 md:grid-cols-2">
              <BookingDetails bookingData={bookingData} />
              <CustomerInfo bookingData={bookingData} />
            </div>
          )}

          <InfoMessages />
          <ActionButtons establishment={establishment} />
        </div>
      </div>
    </div>
  );
}
