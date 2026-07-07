"use client";

import { useParams } from "next/navigation";

import { DailyReportClient } from "@/app/[locale]/(root)/(dashboard)/_components/orders/daily-report-client";

export default function AdminDailyReportPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <DailyReportClient establishmentId={establishmentId} organizationId={organizationId} />;
}
