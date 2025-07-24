"use client";
import { useParams } from "next/navigation";

import { EstablishmentSlotsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-slots-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EstablishmentSlotsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentSlotsShared organizationId={organizationId || ""} establishmentId={establishmentId} />;
}
