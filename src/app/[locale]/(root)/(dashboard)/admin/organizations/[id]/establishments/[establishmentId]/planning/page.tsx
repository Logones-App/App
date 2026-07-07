"use client";

import { useParams } from "next/navigation";

import { PlanningSchedule } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/planning-schedule";

export default function AdminPlanningPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <PlanningSchedule establishmentId={establishmentId} organizationId={organizationId} />;
}
