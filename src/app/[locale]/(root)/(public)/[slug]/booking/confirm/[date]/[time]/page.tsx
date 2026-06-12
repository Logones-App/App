"use client";

import React, { useState, useEffect } from "react";

import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";
import { Tables } from "@/lib/supabase/database.types";

import { BookingSummary } from "../../../_components/booking-components";
import { BookingForm } from "../../../_components/booking-form";
import { getEstablishmentBySlug, createBooking } from "../../../_components/database-utils";
import { EstablishmentInfo } from "../../../_components/establishment-info";
import { LoadingState, ErrorState } from "../../../_components/loading-states";

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
    locale: string;
    date: string;
    time: string;
  }>;
}

const isCustomDomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname !== "logones.fr" && hostname !== "localhost" && !hostname.includes("127.0.0.1");
};

const generateSuccessUrl = (establishment: Establishment, bookingId?: string): string => {
  const base = isCustomDomain() ? "/booking/success" : `/${establishment.slug}/booking/success`;
  return bookingId ? `${base}?bookingId=${bookingId}` : base;
};

const validateBookingForm = (formData: BookingFormData, t: ReturnType<typeof useTranslations>): string | null => {
  if (!formData.firstName.trim()) return t("validation.first_name_required");
  if (!formData.lastName.trim()) return t("validation.last_name_required");
  if (!formData.email.trim()) return t("validation.email_required");
  if (!formData.phone.trim()) return t("validation.phone_required");
  if (formData.numberOfGuests < 1 || formData.numberOfGuests > 50) {
    return t("validation.number_of_guests_min") + " - " + t("validation.number_of_guests_max");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return t("validation.email_invalid");
  return null;
};

export default function BookingConfirmPage({ params }: BookingPageProps) {
  const router = useRouter();
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
        const slug = resolvedParams.slug;

        if (!slug) return;

        if (!resolvedParams.date || !resolvedParams.time) {
          router.push(`/${slug}/booking`);
          return;
        }

        setSelectedDate(parseISO(resolvedParams.date));
        // HH-MM → HH:MM (replaceAll pour robustesse)
        setSelectedTime(resolvedParams.time.replaceAll("-", ":"));

        const data = await getEstablishmentBySlug(slug);
        setEstablishment(data);
      } catch {
        // silently fail — ErrorState s'affiche via le guard ci-dessous
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateBookingForm(formData, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!establishment || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await createBooking(
        establishment.id,
        establishment.organization_id,
        format(selectedDate, "yyyy-MM-dd"),
        selectedTime,
        formData,
      );

      if (result.success && result.bookingData) {
        useBookingConfirmationStore.getState().setConfirmationData(result.bookingData);
        const tempToken = btoa(`${result.bookingId}:${Date.now()}:${establishment.id}`);
        router.push(generateSuccessUrl(establishment, tempToken));
      } else {
        setError(result.error ?? t("error.generic"));
      }
    } catch {
      setError(t("error.unexpected"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!establishment || !selectedDate || !selectedTime) return <ErrorState establishmentSlug={establishment?.slug} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                <h1 className="text-lg font-semibold text-gray-900">
                  {t("title")} - {establishment.name}
                </h1>
                <p className="text-sm text-gray-500">{t("subtitle")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BookingSummary
              establishment={establishment}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              numberOfGuests={formData.numberOfGuests}
            />
            <EstablishmentInfo establishment={establishment} />
          </div>

          <div className="lg:col-span-2">
            <BookingForm
              formData={formData}
              setFormData={setFormData}
              error={error}
              submitting={submitting}
              onSubmit={handleSubmit}
            />

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
