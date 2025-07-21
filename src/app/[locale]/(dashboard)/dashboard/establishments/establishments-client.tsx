"use client";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { EstablishmentsShared } from "@/app/[locale]/(dashboard)/_components/establishments/establishments-shared";

export function EstablishmentsClient() {
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentsShared organizationId={organizationId || ""} />;
}
