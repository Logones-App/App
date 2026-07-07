"use client";

import { useParams } from "next/navigation";

import { EmployeesPage } from "@/app/[locale]/(root)/(dashboard)/_components/rh/employees-page";

export default function AdminEstablishmentEmployeesPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <EmployeesPage organizationId={organizationId} establishmentId={establishmentId} />;
}
