"use client";

import { useParams } from "next/navigation";

import { EmployeeAccessPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/employee-access/employee-access-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EmployeeAccessClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  return <EmployeeAccessPage establishmentId={establishmentId} organizationId={organizationId} />;
}
