"use client";

import { useParams } from "next/navigation";

import { EstablishmentModulesPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-modules/establishment-modules-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function ModulesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  return <EstablishmentModulesPage establishmentId={establishmentId} organizationId={organizationId} />;
}
