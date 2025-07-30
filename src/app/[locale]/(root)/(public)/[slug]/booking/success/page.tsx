"use client";

import React, { useState, useEffect } from "react";

import { useSearchParams } from "next/navigation";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  ArrowLeft,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  Download,
  Share2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";
import { Tables } from "@/lib/supabase/database.types";

// Import des composants extraits
import { BookingDetails } from "../_components/booking-components";
import { getEstablishmentBySlug, getBooking } from "../_components/database-utils";
import { EstablishmentInfo } from "../_components/establishment-info";
import { ConfirmationLoadingState, ErrorState } from "../_components/loading-states";

type Establishment = Tables<"establishments">;

interface Booking {
  id: string;
  establishment_id: string;
  date: string;
  time: string;
  service_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_guests: number;
  special_requests: string | null;
  status: string;
  created_at: string;
}

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
  }>;
}

export default function BookingSuccessPage({ params }: BookingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Booking.success");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

        // Récupérer depuis Zustand
        const bookingData = useBookingConfirmationStore.getState().getConfirmationData();

        if (!bookingData) {
          console.log("❌ Pas de données de confirmation, redirection");
          router.push(`/${establishmentSlug}/booking`);
          return;
        }

        // Récupérer l'établissement
        const establishmentData = await getEstablishmentBySlug(establishmentSlug);

        setEstablishment(establishmentData);

        // Adapter les données pour correspondre à l'interface Booking
        const adaptedBooking: Booking = {
          ...bookingData,
          special_requests: bookingData.special_requests ?? null,
        };

        setBooking(adaptedBooking);

        // Nettoyer le store après utilisation
        useBookingConfirmationStore.getState().clearConfirmationData();
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
      } finally {
        setLoading(false);
      }
    }

    // Ajouter un petit délai pour permettre à Next.js de charger les paramètres
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, [params, router]);

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  // Fonction pour télécharger la confirmation
  const handleDownload = () => {
    if (!booking || !establishment) return;

    const content = `
RÉSERVATION CONFIRMÉE

Établissement: ${establishment.name}
Date: ${formatDate(booking.date)}
Heure: ${booking.time}
Nombre de personnes: ${booking.number_of_guests}
Nom: ${booking.customer_first_name} ${booking.customer_last_name}
Email: ${booking.customer_email}
Téléphone: ${booking.customer_phone}
Statut: ${booking.status}

Référence: ${booking.id}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservation-${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fonction pour partager
  const handleShare = async () => {
    if (!booking || !establishment) return;

    const shareData = {
      title: `Réservation confirmée - ${establishment.name}`,
      text: `Ma réservation pour ${establishment.name} le ${formatDate(booking.date)} à ${booking.time}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copier l'URL
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Erreur lors du partage:", error);
    }
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return <ConfirmationLoadingState />;
  }

  // Afficher une erreur si les données ne sont pas trouvées
  if (!establishment || !booking) {
    return <ErrorState establishmentSlug={establishment?.slug} />;
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
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Réservation confirmée - {establishment.name}</h1>
                <p className="text-sm text-gray-500">Votre réservation a été créée avec succès</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Confirmation principale */}
          <div className="lg:col-span-2">
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-700">Réservation confirmée !</CardTitle>
                <CardDescription>
                  Votre réservation a été créée avec succès. Vous recevrez un email de confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Détails de la réservation */}
                <BookingDetails booking={booking} establishment={establishment} />

                {/* Demandes spéciales */}
                {booking.special_requests && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="mb-2 font-medium">Demandes spéciales :</h4>
                    <p className="text-muted-foreground text-sm">{booking.special_requests}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="flex-1">
                    <Share2 className="mr-2 h-4 w-4" />
                    {copied ? "Copié !" : "Partager"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informations supplémentaires */}
            <Card className="mt-6 shadow-lg">
              <CardHeader>
                <CardTitle>Informations importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Confirmation par email :</strong> Vous recevrez un email de confirmation dans les prochaines
                    minutes.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertDescription>
                    <strong>Modification :</strong> Pour modifier votre réservation, contactez directement
                    l&apos;établissement.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertDescription>
                    <strong>Annulation :</strong> Vous pouvez annuler votre réservation jusqu&apos;à 2 heures avant.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Informations de l'établissement */}
          <div className="lg:col-span-1">
            <EstablishmentInfo establishment={establishment} />

            {/* Boutons d'action */}
            <div className="mt-6 space-y-3">
              <Link href={`/${establishment.slug}`}>
                <Button className="w-full">Retour à l&apos;établissement</Button>
              </Link>
              <Link href={`/${establishment.slug}/booking`}>
                <Button variant="outline" className="w-full">
                  Nouvelle réservation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
