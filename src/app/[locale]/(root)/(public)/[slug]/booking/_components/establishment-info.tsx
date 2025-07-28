import { MapPin, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

// Composant pour les informations de l'établissement
export function EstablishmentInfo({ establishment }: { establishment: Establishment }) {
  const t = useTranslations("Booking");

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="text-primary h-5 w-5" />
          {establishment.name}
        </CardTitle>
        <CardDescription>{establishment.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{establishment.address}</span>
        </div>
        {establishment.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{establishment.phone}</span>
          </div>
        )}
        {establishment.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{establishment.email}</span>
          </div>
        )}
        {establishment.website && (
          <div className="pt-2">
            <a
              href={establishment.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline"
            >
              {t("page.establishment_info.visit_website")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
