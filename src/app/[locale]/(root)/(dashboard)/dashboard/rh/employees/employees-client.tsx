"use client";

import { Loader2 } from "lucide-react";

import { EmployeesPage } from "@/app/[locale]/(root)/(dashboard)/_components/rh/employees-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EmployeesClient() {
  const organizationId = useOrgaUserOrganizationId();

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement…</span>
      </div>
    );
  }

  return <EmployeesPage organizationId={organizationId} />;
}
