"use client";

import { useParams } from "next/navigation";

import { RoomsTablesPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/rooms-tables-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function SallesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  return <RoomsTablesPage establishmentId={establishmentId} organizationId={organizationId} />;
}
