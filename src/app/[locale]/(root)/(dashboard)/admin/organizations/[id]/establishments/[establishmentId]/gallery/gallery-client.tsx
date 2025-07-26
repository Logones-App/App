"use client";
import { useParams } from "next/navigation";

import { EstablishmentGalleryShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-gallery-shared";

export function EstablishmentGalleryClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <EstablishmentGalleryShared organizationId={organizationId} establishmentId={establishmentId} />;
}
