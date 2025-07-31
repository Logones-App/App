import React from "react";

import { MapPin, Phone, Mail, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  cover_image_url: string | null;
  website: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

interface EstablishmentInfoProps {
  establishment: Establishment;
}

export function EstablishmentInfo({ establishment }: EstablishmentInfoProps) {
  const t = useTranslations("Booking");

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {establishment.logo_url && (
            <img src={establishment.logo_url} alt={establishment.name} className="h-8 w-8 rounded-full object-cover" />
          )}
          {establishment.name}
        </CardTitle>
        <CardDescription>{establishment.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adresse */}
        <div className="flex items-start gap-3">
          <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">{t("address")}</p>
            <p className="text-muted-foreground text-sm">{establishment.address}</p>
          </div>
        </div>

        {/* Téléphone */}
        {establishment.phone && (
          <div className="flex items-center gap-3">
            <Phone className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="font-medium">{t("phone")}</p>
              <p className="text-muted-foreground text-sm">{establishment.phone}</p>
            </div>
          </div>
        )}

        {/* Email */}
        {establishment.email && (
          <div className="flex items-center gap-3">
            <Mail className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="font-medium">{t("email")}</p>
              <p className="text-muted-foreground text-sm">{establishment.email}</p>
            </div>
          </div>
        )}

        {/* Site web */}
        {establishment.website && (
          <div className="flex items-center gap-3">
            <Globe className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="font-medium">{t("website")}</p>
              <a
                href={establishment.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                {establishment.website}
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
