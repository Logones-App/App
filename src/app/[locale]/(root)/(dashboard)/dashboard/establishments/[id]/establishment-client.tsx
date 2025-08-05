"use client";
import { useParams } from "next/navigation";

import { EstablishmentDetailsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-details-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EstablishmentClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentDetailsShared establishmentId={establishmentId} organizationId={organizationId ?? ""} />;
}
