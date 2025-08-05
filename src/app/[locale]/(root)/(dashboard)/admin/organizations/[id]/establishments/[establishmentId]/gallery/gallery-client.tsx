"use client";

import React from "react";

import { useParams } from "next/navigation";

import { EstablishmentGalleryShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-gallery-shared";

export function EstablishmentGalleryClient() {
  const params = useParams();
  const establishmentId = params.establishmentId as string;
  const organizationId = params.id as string;

  return (
    <EstablishmentGalleryShared
      establishmentId={establishmentId}
      organizationId={organizationId}
      isSystemAdmin={true}
    />
  );
}
