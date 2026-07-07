"use client";

import { useParams } from "next/navigation";

import { RoomsTablesPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/rooms-tables-page";

export default function AdminRoomsPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <RoomsTablesPage establishmentId={establishmentId} organizationId={organizationId} />;
}
