"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { OpeningHoursShared } from "@/app/[locale]/(dashboard)/_components/establishments/opening-hours-shared";
export function OpeningHoursClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <OpeningHoursShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
