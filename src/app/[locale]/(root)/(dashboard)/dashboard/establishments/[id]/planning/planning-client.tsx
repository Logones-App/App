"use client";

import { useParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { PlanningSchedule } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/planning-schedule";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function PlanningClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de l&apos;organisation...</span>
      </div>
    );
  }

  return <PlanningSchedule establishmentId={establishmentId} organizationId={organizationId} />;
}
