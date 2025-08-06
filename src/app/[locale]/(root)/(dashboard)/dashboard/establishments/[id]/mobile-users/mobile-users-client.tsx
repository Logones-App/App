"use client";

import React from "react";

import { useParams } from "next/navigation";

import { MobileUsersShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/mobile-users/mobile-users-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function MobileUsersClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  return <MobileUsersShared establishmentId={establishmentId} organizationId={organizationId ?? ""} isAdmin={false} />;
}
