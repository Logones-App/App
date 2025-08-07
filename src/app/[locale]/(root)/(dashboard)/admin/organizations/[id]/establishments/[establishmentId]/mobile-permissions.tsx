"use client";

import { useParams } from "next/navigation";

import { MobileUserPermissionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/mobile-user-permissions/mobile-user-permissions-shared";

export function MobileUserPermissions() {
  const params = useParams();
  const establishmentId = params.establishmentId as string;
  const organizationId = params.id as string;

  return (
    <MobileUserPermissionsShared establishmentId={establishmentId} organizationId={organizationId} isAdmin={true} />
  );
}
