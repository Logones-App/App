"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentDetailsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-details-shared";

export function EstablishmentClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentDetailsShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
