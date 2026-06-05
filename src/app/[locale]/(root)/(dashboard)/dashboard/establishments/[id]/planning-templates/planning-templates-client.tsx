"use client";

import { useParams } from "next/navigation";

import { PlanningTemplatesPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/planning-templates/planning-templates-page";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function PlanningTemplatesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  return <PlanningTemplatesPage establishmentId={establishmentId} organizationId={organizationId} />;
}
