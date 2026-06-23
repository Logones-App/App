"use client";

import { useParams } from "next/navigation";

import { EmployeesPage } from "@/app/[locale]/(root)/(dashboard)/_components/rh/employees-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EstablishmentEmployeesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  return <EmployeesPage organizationId={organizationId} establishmentId={establishmentId} />;
}
