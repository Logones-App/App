"use client";
import { useParams } from "next/navigation";

import { OpeningHoursShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/opening-hours-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function OpeningHoursClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <OpeningHoursShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
