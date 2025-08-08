"use client";

import { useParams } from "next/navigation";

import { DevicesShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/devices/devices-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function DevicesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? undefined;

  return <DevicesShared establishmentId={establishmentId} organizationId={organizationId} isAdmin={false} />;
}
