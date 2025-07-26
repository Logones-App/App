"use client";
import { useParams } from "next/navigation";

import { EstablishmentDetailsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-details-shared";

export function EstablishmentClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <EstablishmentDetailsShared establishmentId={establishmentId} organizationId={organizationId} />;
}
