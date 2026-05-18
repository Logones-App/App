"use client";

import { useParams } from "next/navigation";

import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

import { EstablishmentOrdersClient } from "../../../../_components/orders/establishment-orders-client";

export default function EstablishmentOrdersPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";

  if (!organizationId) return null;

  return <EstablishmentOrdersClient establishmentId={establishmentId} organizationId={organizationId} />;
}
