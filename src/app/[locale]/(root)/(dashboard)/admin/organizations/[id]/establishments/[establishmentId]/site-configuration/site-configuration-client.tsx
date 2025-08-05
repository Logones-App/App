"use client";

import { useState, useEffect } from "react";

import { useParams } from "next/navigation";

import { useTranslations } from "next-intl";

import { EstablishmentSiteConfigurationShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared";
import { createClient } from "@/lib/supabase/client";

export function EstablishmentSiteConfigurationClient() {
  const params = useParams();
  const t = useTranslations("SiteConfiguration");
  const [establishmentName, setEstablishmentName] = useState("");
  const [loading, setLoading] = useState(true);

  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  useEffect(() => {
    const fetchEstablishment = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("establishments").select("name").eq("id", establishmentId).single();

        if (data) {
          setEstablishmentName(data.name);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'établissement:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstablishment();
  }, [establishmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <EstablishmentSiteConfigurationShared
      establishmentId={establishmentId}
      organizationId={organizationId}
      establishmentName={establishmentName}
      isSystemAdmin={true}
    />
  );
}
