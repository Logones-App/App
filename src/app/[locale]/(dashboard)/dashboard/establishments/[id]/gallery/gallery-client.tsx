"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentGalleryShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-gallery-shared";

export function EstablishmentGalleryClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentGalleryShared organizationId={organizationId || ""} establishmentId={establishmentId} />;
}
