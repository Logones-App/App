"use client";
import { useParams } from "next/navigation";

import { EstablishmentsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishments-shared";

export default function OrganizationEstablishmentsPage() {
  const params = useParams();
  const organizationId = params.id as string;
  return <EstablishmentsShared organizationId={organizationId} />;
}
