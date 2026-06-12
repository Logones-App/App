"use client";

import React, { useState, useEffect } from "react";

import { format } from "date-fns";
import { Calendar, ArrowLeft, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { Tables } from "@/lib/supabase/database.types";

import { getEstablishmentBySlug } from "./_components/database-utils";
import { EstablishmentInfo } from "./_components/establishment-info";
import { LoadingState, ErrorState } from "./_components/loading-states";

type Value = Date | undefined;

interface BookingPageProps {
  params: Promise<{
    slug?: string;
    locale: string;
  }>;
}

type Establishment = Tables<"establishments">;

export default function BookingPage({ params }: BookingPageProps) {
  const { slug } = React.use(params);
  const router = useRouter();
  const t = useTranslations("Booking");

  const [selectedDate, setSelectedDate] = useState<Value>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getEstablishmentBySlug(slug)
      .then(setEstablishment)
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleDateSelect = (date: Date) => {
    if (!establishment) return;
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    router.push(`/${establishment.slug}/booking/slots/${format(localDate, "yyyy-MM-dd")}`);
  };

  if (loading) return <LoadingState />;
  if (!establishment) return <ErrorState />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <EstablishmentInfo establishment={establishment} />
          </div>

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
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border shadow-sm"
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </div>

                  {selectedDate && (
                    <div className="space-y-4 text-center">
                      <div className="bg-primary/5 rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">{t("page.calendar.selected_date")}</p>
                        <p className="text-primary text-lg font-semibold">{formatDate(selectedDate)}</p>
                      </div>
                      <Button onClick={() => handleDateSelect(selectedDate)} className="w-full" size="lg">
                        <Clock className="mr-2 h-4 w-4" />
                        {t("page.calendar.continue_button")}
                      </Button>
                    </div>
                  )}

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
