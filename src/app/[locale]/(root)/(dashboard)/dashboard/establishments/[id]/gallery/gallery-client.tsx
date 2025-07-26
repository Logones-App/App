"use client";
import { useParams } from "next/navigation";

import { EstablishmentGalleryShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-gallery-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EstablishmentGalleryClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentGalleryShared organizationId={organizationId || ""} establishmentId={establishmentId} />;
}
