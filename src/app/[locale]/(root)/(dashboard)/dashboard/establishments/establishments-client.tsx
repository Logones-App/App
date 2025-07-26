"use client";
import { EstablishmentsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishments-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function EstablishmentsClient() {
  const organizationId = useOrgaUserOrganizationId();
  return <EstablishmentsShared organizationId={organizationId || ""} />;
}
