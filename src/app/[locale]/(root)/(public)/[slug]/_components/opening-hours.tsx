"use client";

import { useTranslations } from "next-intl";
import { Tables } from "@/lib/supabase/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

type OpeningHours = Tables<"opening_hours">;

interface OpeningHoursProps {
  openingHours: OpeningHours[];
}

export function OpeningHours({ openingHours }: OpeningHoursProps) {
  const t = useTranslations("restaurant_public.opening_hours");
  const tDays = useTranslations("establishments.days");

  // Créer un mapping des jours avec leur ordre
  const dayOrder = {
    [tDays("1")]: 1, // Lundi
    [tDays("2")]: 2, // Mardi
    [tDays("3")]: 3, // Mercredi
    [tDays("4")]: 4, // Jeudi
    [tDays("5")]: 5, // Vendredi
    [tDays("6")]: 6, // Samedi
    [tDays("0")]: 7, // Dimanche (en dernier)
  };

  // Grouper les horaires par jour de la semaine
  const groupedHours = openingHours.reduce(
    (acc, hours) => {
      const dayName = tDays(hours.day_of_week.toString());
      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push(hours);
      return acc;
    },
    {} as Record<string, OpeningHours[]>,
  );

  // Trier les jours dans l'ordre (Lundi = 1 en premier)
  const sortedDays = Object.keys(groupedHours).sort((a, b) => {
    const orderA = dayOrder[a] || 0;
    const orderB = dayOrder[b] || 0;
    return orderA - orderB;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedDays.map((dayName) => {
            const dayHours = groupedHours[dayName];
            return (
              <div key={dayName} className="flex items-center justify-between py-1">
                <span className="min-w-[80px] font-medium text-gray-700">{dayName}</span>
                <span className="text-right text-gray-600">
                  {dayHours.map((hours, index) => (
                    <span key={hours.id}>
                      {hours.open_time} - {hours.close_time}
                      {index < dayHours.length - 1 && " / "}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
          {sortedDays.length === 0 && <p className="text-gray-500 italic">{t("not_available")}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
