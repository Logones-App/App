"use client";

import { useParams } from "next/navigation";

import { EmployeeAccessPage } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/employee-access/employee-access-page";

export default function AdminEmployeeAccessPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <EmployeeAccessPage establishmentId={establishmentId} organizationId={organizationId} />;
}
