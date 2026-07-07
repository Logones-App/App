"use client";

import { useParams } from "next/navigation";

import { EstablishmentOrdersClient } from "@/app/[locale]/(root)/(dashboard)/_components/orders/establishment-orders-client";

export default function AdminEstablishmentOrdersPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <EstablishmentOrdersClient establishmentId={establishmentId} organizationId={organizationId} />;
}
