"use client";

import { useParams } from "next/navigation";

import { DevicesShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/devices/devices-shared";

export function DevicesClient() {
  const params = useParams();
  const establishmentId = params.establishmentId as string;
  const organizationId = params.id as string;

  return <DevicesShared establishmentId={establishmentId} organizationId={organizationId} isAdmin={true} />;
}
