"use client";

import { OrganizationModulesPage } from "@/app/[locale]/(root)/(dashboard)/_components/organization-modules/organization-modules-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function OrganizationModulesClient() {
  const organizationId = useOrgaUserOrganizationId() ?? "";
  return <OrganizationModulesPage organizationId={organizationId} />;
}
