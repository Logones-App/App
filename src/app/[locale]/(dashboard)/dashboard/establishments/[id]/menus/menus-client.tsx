"use client";
import { useParams } from "next/navigation";

import { MenusShared } from "@/app/[locale]/(dashboard)/_components/establishments/menus-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function MenusClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <MenusShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
