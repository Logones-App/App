"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { BookingsShared } from "@/app/[locale]/(dashboard)/_components/establishments/bookings-shared";
export function BookingsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <BookingsShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
