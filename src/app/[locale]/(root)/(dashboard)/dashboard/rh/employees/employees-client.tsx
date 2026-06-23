"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import type { EstablishmentOption } from "@/app/[locale]/(root)/(dashboard)/_components/rh/employee-modal";
import { EmployeesPage } from "@/app/[locale]/(root)/(dashboard)/_components/rh/employees-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { createClient } from "@/lib/supabase/client";

export function EmployeesClient() {
  const organizationId = useOrgaUserOrganizationId();
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    const supabase = createClient();
    supabase
      .from("establishments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("deleted", false)
      .order("name")
      .then(({ data }) => setEstablishments(data ?? []));
  }, [organizationId]);

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement…</span>
      </div>
    );
  }

  return <EmployeesPage organizationId={organizationId} establishments={establishments} />;
}
