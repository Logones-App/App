"use client";

import { useParams } from "next/navigation";

import { OrganizationModulesAdminPage } from "@/app/[locale]/(root)/(dashboard)/_components/admin/organization-modules-admin-page";

export function ModulesAdminClient() {
  const params = useParams();
  const organizationId = params.id as string;

  return <OrganizationModulesAdminPage organizationId={organizationId} />;
}
