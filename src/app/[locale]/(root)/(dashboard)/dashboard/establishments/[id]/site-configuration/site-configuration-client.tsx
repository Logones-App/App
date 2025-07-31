"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentSiteConfigurationShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared";

export function EstablishmentSiteConfigurationClient() {
  const params = useParams();
  const t = useTranslations("SiteConfiguration");
  const [establishmentName, setEstablishmentName] = useState("");
  const [loading, setLoading] = useState(true);

  const organizationId = useOrgaUserOrganizationId();
  const establishmentId = params.id as string;

  useEffect(() => {
    if (!establishmentId) {
      setLoading(false);
      return;
    }

    const fetchEstablishment = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("establishments").select("name").eq("id", establishmentId).single();

        if (error) {
          console.error("Erreur lors de la récupération de l'établissement:", error);
        } else if (data) {
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

  if (!establishmentId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-destructive mb-2 text-xl font-semibold">{t("errors.establishmentNotFound")}</h2>
          <p className="text-muted-foreground">{t("errors.establishmentNotFoundDescription")}</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-destructive mb-2 text-xl font-semibold">{t("errors.organizationNotFound")}</h2>
          <p className="text-muted-foreground">{t("errors.organizationNotFoundDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <EstablishmentSiteConfigurationShared
      establishmentId={establishmentId}
      organizationId={organizationId}
      establishmentName={establishmentName}
      isSystemAdmin={false}
    />
  );
}
