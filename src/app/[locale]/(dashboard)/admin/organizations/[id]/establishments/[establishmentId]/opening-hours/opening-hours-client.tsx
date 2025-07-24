"use client";
import { useParams } from "next/navigation";

import { OpeningHoursShared } from "@/app/[locale]/(dashboard)/_components/establishments/opening-hours-shared";

export function OpeningHoursClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <OpeningHoursShared establishmentId={establishmentId} organizationId={organizationId} />;
}
