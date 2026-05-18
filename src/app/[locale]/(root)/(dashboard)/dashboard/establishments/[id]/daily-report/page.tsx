"use client";

import { useParams } from "next/navigation";

import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

import { DailyReportClient } from "../../../../_components/orders/daily-report-client";

export default function DailyReportPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  if (!organizationId) return null;

  return <DailyReportClient establishmentId={establishmentId} organizationId={organizationId} />;
}
