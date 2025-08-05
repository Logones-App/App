"use client";

import { useTranslations } from "next-intl";

import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;
type OpeningHoursType = Tables<"opening_hours">;

interface RestaurantFooterProps {
  establishment: Establishment;
  openingHours: OpeningHoursType[];
}

export function RestaurantFooter({ establishment, openingHours }: RestaurantFooterProps) {
  const t = useTranslations("restaurant_public.footer");
  const tDays = useTranslations("establishments.days");

  // Créer un mapping des jours avec leur ordre (abréviations)
  const dayOrder = {
    [tDays("1").substring(0, 3)]: 1, // Lun
    [tDays("2").substring(0, 3)]: 2, // Mar
    [tDays("3").substring(0, 3)]: 3, // Mer
    [tDays("4").substring(0, 3)]: 4, // Jeu
    [tDays("5").substring(0, 3)]: 5, // Ven
    [tDays("6").substring(0, 3)]: 6, // Sam
    [tDays("0").substring(0, 3)]: 7, // Dim
  };

  // Grouper les horaires par jour de la semaine
  const groupedHours = openingHours.reduce(
    (acc, hours) => {
      const dayName = tDays(hours.day_of_week.toString()).substring(0, 3);
      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push(hours);
      return acc;
    },
    {} as Record<string, OpeningHoursType[]>,
  );

  // Trier les jours dans l'ordre (Lundi = 1 en premier)
  const sortedDays = Object.keys(groupedHours).sort((a, b) => {
    const orderA = dayOrder[a] || 0;
    const orderB = dayOrder[b] || 0;
    return orderA - orderB;
  });

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Informations du restaurant */}
          <div>
            <h3 className="mb-4 text-xl font-bold">{establishment.name}</h3>
            <p className="mb-4 text-gray-300">{establishment.description}</p>
            {establishment.address && <p className="text-gray-300">{establishment.address}</p>}
          </div>

          {/* Horaires d'ouverture */}
          <div>
            <h3 className="mb-4 text-xl font-bold">{t("opening_hours")}</h3>
            <div className="space-y-2">
              {sortedDays.map((dayName) => {
                const dayHours = groupedHours[dayName];
                return (
                  <div key={dayName} className="flex justify-between">
                    <span className="text-gray-300">{dayName}</span>
                    <span className="text-gray-300">
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
              {sortedDays.length === 0 && <p className="text-gray-400 italic">{t("not_available")}</p>}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-xl font-bold">Contact</h3>
            <div className="space-y-2">
              {establishment.phone && <p className="text-gray-300">📞 {establishment.phone}</p>}
              {establishment.email && <p className="text-gray-300">✉️ {establishment.email}</p>}
              {establishment.website && <p className="text-gray-300">🌐 {establishment.website}</p>}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} {establishment.name}. {t("all_rights_reserved")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
