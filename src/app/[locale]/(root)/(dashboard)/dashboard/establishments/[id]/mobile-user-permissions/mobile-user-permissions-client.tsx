"use client";

import { useParams } from "next/navigation";

import { MobileUserPermissionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/mobile-user-permissions/mobile-user-permissions-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function MobileUserPermissionsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? undefined;

  return (
    <MobileUserPermissionsShared establishmentId={establishmentId} organizationId={organizationId} isAdmin={false} />
  );
}
