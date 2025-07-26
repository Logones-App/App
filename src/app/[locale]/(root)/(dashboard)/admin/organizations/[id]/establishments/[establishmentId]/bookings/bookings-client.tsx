"use client";
import { useParams } from "next/navigation";

import { BookingsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/bookings-shared";

export function BookingsClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <BookingsShared establishmentId={establishmentId} organizationId={organizationId} />;
}
