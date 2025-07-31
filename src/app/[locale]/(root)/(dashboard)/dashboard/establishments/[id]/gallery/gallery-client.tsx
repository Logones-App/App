"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentGalleryShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-gallery-shared";

export function EstablishmentGalleryClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  if (!organizationId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold">Accès non autorisé</h2>
          <p className="text-muted-foreground">
            Vous devez être connecté à une organisation pour accéder à la galerie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EstablishmentGalleryShared
      establishmentId={establishmentId}
      organizationId={organizationId}
      isSystemAdmin={false}
    />
  );
}
