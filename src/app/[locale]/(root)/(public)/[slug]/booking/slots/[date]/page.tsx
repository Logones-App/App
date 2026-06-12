"use client";

import React, { useState, useEffect } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { RealtimeSlotsDisplay } from "@/components/realtime-slots-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSlotsWithExceptions } from "@/hooks/use-slots-with-exceptions";
import { Link, useRouter } from "@/i18n/navigation";
import { Tables } from "@/lib/supabase/database.types";
import type { ServiceGroup } from "@/lib/utils/slots-realtime-utils";

import { getEstablishmentBySlug } from "../../_components/database-utils";
import { EstablishmentInfo } from "../../_components/establishment-info";
import { SlotsLoadingState, ErrorState } from "../../_components/loading-states";
import { DateInfo, SelectedSlotDisplay } from "../../_components/slots-components";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId?: string;
}

type Establishment = Tables<"establishments">;
type BookingException = Tables<"booking_exceptions">;
type TranslateFn = ReturnType<typeof useTranslations>;

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    locale: string;
    date: string;
  }>;
}

function BookingHeader({
  establishment,
  selectedDate,
  formatDate,
  t,
}: {
  establishment: Establishment;
  selectedDate: Date;
  formatDate: (date: Date) => string;
  t: TranslateFn;
}) {
  return (
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
  );
}

function EstablishmentSection({
  establishment,
  selectedDate,
  exceptions,
}: {
  establishment: Establishment;
  selectedDate: Date;
  exceptions: BookingException[];
}) {
  return (
    <div className="lg:col-span-1">
      <EstablishmentInfo establishment={establishment} />
      <DateInfo selectedDate={selectedDate} />

      {exceptions.length > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-4">
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
  );
}

function SlotsGrid({
  serviceGroups,
  selectedSlot,
  setSelectedSlot,
  slotsLoading,
  exceptions,
  handleContinue,
  establishment,
  selectedDate,
}: {
  serviceGroups: ServiceGroup[];
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  slotsLoading: boolean;
  exceptions: BookingException[];
  handleContinue: () => void;
  establishment: Establishment;
  selectedDate: Date;
}) {
  return (
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
            {exceptions.length > 0 && (
              <span className="ml-2 text-orange-600">
                • {exceptions.length} exception{exceptions.length > 1 ? "s" : ""} active
                {exceptions.length > 1 ? "s" : ""}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RealtimeSlotsDisplay
            establishmentId={establishment.id}
            date={selectedDate}
            serviceGroups={serviceGroups}
            exceptions={exceptions}
            onSlotSelect={setSelectedSlot}
            selectedSlot={selectedSlot}
          />

          {selectedSlot && <SelectedSlotDisplay selectedSlot={selectedSlot} />}

          {selectedSlot && (
            <div className="mt-6">
              <Button onClick={handleContinue} className="w-full" size="lg">
                Continuer vers la réservation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <Link href={`/${establishment.slug}/booking`}>
              <Button variant="outline" className="w-full">
                ← Retour à la sélection de date
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingSlotsPage({ params }: BookingPageProps) {
  const router = useRouter();
  const t = useTranslations("Booking.slots");
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    serviceGroups,
    isLoading: slotsLoading,
    exceptions,
  } = useSlotsWithExceptions({
    establishmentId: establishment?.id ?? "",
    date: selectedDate ?? new Date(),
    enabled: !!establishment?.id && !!selectedDate,
  });

  useEffect(() => {
    async function load() {
      const resolvedParams = await params;
      const slug = resolvedParams.slug;

      if (!slug) {
        setLoading(false);
        return;
      }

      if (!resolvedParams.date) {
        router.push(`/${slug}/booking`);
        return;
      }

      setSelectedDate(parseISO(resolvedParams.date));
      const data = await getEstablishmentBySlug(slug);
      setEstablishment(data);
      setLoading(false);
    }

    load();
  }, [params, router]);

  const formatDate = (date: Date) => format(date, "EEEE d MMMM yyyy", { locale: fr });

  const handleContinue = () => {
    if (!establishment || !selectedSlot || !selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const formattedTime = selectedSlot.time.replace(":", "-");

    const isCustomDomain =
      window.location.hostname !== "logones.fr" &&
      window.location.hostname !== "localhost" &&
      !window.location.hostname.includes("127.0.0.1");

    const targetUrl = isCustomDomain
      ? `/booking/confirm/${formattedDate}/${formattedTime}`
      : `/${establishment.slug}/booking/confirm/${formattedDate}/${formattedTime}`;

    router.push(targetUrl);
  };

  if (loading) return <SlotsLoadingState />;
  if (!establishment || !selectedDate) return <ErrorState establishmentSlug={establishment?.slug} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <BookingHeader establishment={establishment} selectedDate={selectedDate} formatDate={formatDate} t={t} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <EstablishmentSection establishment={establishment} selectedDate={selectedDate} exceptions={exceptions} />
          <SlotsGrid
            serviceGroups={serviceGroups}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            slotsLoading={slotsLoading}
            exceptions={exceptions}
            handleContinue={handleContinue}
            establishment={establishment}
            selectedDate={selectedDate}
          />
        </div>
      </div>
    </div>
  );
}
