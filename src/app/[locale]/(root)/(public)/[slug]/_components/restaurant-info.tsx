"use client";

import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface RestaurantInfoProps {
  establishment: Establishment;
}

export function RestaurantInfo({ establishment }: RestaurantInfoProps) {
  const t = useTranslations("restaurant_public.info");

  return (
    <section className="bg-white px-4 py-16">
      <div className="container mx-auto">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                {t("address")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{establishment.address ?? t("address_not_available")}</p>
            </CardContent>
          </Card>

          {/* Horaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                {t("hours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t("hours_not_available")}</p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-600" />
                {t("contact")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {establishment.phone && (
                <p className="text-gray-600">
                  <Phone className="mr-2 inline h-4 w-4" />
                  {establishment.phone}
                </p>
              )}
              {establishment.email && (
                <p className="text-gray-600">
                  <Mail className="mr-2 inline h-4 w-4" />
                  {establishment.email}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
