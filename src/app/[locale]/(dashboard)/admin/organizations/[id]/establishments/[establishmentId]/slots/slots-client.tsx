"use client";
import { useParams } from "next/navigation";

import { EstablishmentSlotsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishment-slots-shared";

export function EstablishmentSlotsClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <EstablishmentSlotsShared organizationId={organizationId} establishmentId={establishmentId} />;
}
