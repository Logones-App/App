"use client";

import { useParams } from "next/navigation";

import { EstablishmentModulesPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-modules/establishment-modules-page";

export default function AdminEstablishmentModulesPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <EstablishmentModulesPage establishmentId={establishmentId} organizationId={organizationId} />;
}
