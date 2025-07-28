"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

// Import des composants extraits
import { BookingSummary } from "../_components/booking-components";
import { BookingForm } from "../_components/booking-form";
import { getEstablishmentBySlug, createBooking } from "../_components/database-utils";
import { EstablishmentInfo } from "../_components/establishment-info";
import { LoadingState, ErrorState } from "../_components/loading-states";

type Establishment = Tables<"establishments">;

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfGuests: number;
  specialRequests: string;
}

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    establishmentSlug?: string;
    "establishment-slug"?: string;
    locale: string;
  }>;
}

export default function BookingConfirmPage({ params }: BookingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Booking.confirm");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: 2,
    specialRequests: "",
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

        // Récupérer la date et l'heure depuis les paramètres d'URL
        const dateParam = searchParams.get("date");
        const timeParam = searchParams.get("time");

        console.log("🔍 Paramètres de réservation:", { dateParam, timeParam });

        if (!dateParam || !timeParam) {
          console.log("❌ Date ou heure manquante, redirection vers la sélection de date");
          router.push(`/${establishmentSlug}/booking`);
          return;
        }

        const date = parseISO(dateParam);
        console.log("✅ Date parsée:", date);
        setSelectedDate(date);
        setSelectedTime(timeParam);

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
  }, [params, router, searchParams]);

  // Fonction pour valider le formulaire
  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setError("Le prénom est requis");
      return false;
    }
    if (!formData.lastName.trim()) {
      setError("Le nom est requis");
      return false;
    }
    if (!formData.email.trim()) {
      setError("L'email est requis");
      return false;
    }
    if (!formData.phone.trim()) {
      setError("Le téléphone est requis");
      return false;
    }
    if (formData.numberOfGuests < 1 || formData.numberOfGuests > 50) {
      setError("Le nombre de personnes doit être entre 1 et 50");
      return false;
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Format d'email invalide");
      return false;
    }

    setError("");
    return true;
  };

  // Fonction pour soumettre la réservation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!establishment || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    setError("");

    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const result = await createBooking(
        establishment.id,
        establishment.organization_id,
        formattedDate,
        selectedTime,
        formData,
      );

      if (result.success && result.bookingId) {
        // Rediriger vers la page de succès
        const queryParams = new URLSearchParams({
          bookingId: result.bookingId,
        });
        router.push(`/${establishment.slug}/booking/success?${queryParams.toString()}`);
      } else {
        setError(result.error ?? "Erreur lors de la création de la réservation");
      }
    } catch (error) {
      console.error("❌ Erreur lors de la soumission:", error);
      setError("Erreur inattendue lors de la création de la réservation");
    } finally {
      setSubmitting(false);
    }
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return <LoadingState />;
  }

  // Afficher une erreur si l'établissement n'est pas trouvé
  if (!establishment || !selectedDate || !selectedTime) {
    return <ErrorState establishmentSlug={establishment?.slug} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/${establishment.slug}/booking/slots/${format(selectedDate, "yyyy-MM-dd")}`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Confirmer la réservation - {establishment.name}</h1>
                <p className="text-sm text-gray-500">Remplissez vos informations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Récapitulatif de la réservation */}
          <div className="lg:col-span-1">
            <BookingSummary
              establishment={establishment}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              numberOfGuests={formData.numberOfGuests}
            />
            <EstablishmentInfo establishment={establishment} />
          </div>

          {/* Formulaire de réservation */}
          <div className="lg:col-span-2">
            <BookingForm
              formData={formData}
              setFormData={setFormData}
              error={error}
              submitting={submitting}
              onSubmit={handleSubmit}
            />

            {/* Bouton retour */}
            <div className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <Link href={`/${establishment.slug}/booking/slots/${format(selectedDate, "yyyy-MM-dd")}`}>
                    <Button variant="outline" className="w-full">
                      ← Modifier le créneau
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
