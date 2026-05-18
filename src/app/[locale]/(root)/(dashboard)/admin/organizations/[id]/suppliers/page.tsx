"use client";

import { useParams } from "next/navigation";

import { SuppliersClient } from "../../../../_components/suppliers/suppliers-client";

export default function AdminOrgSuppliersPage() {
  const params = useParams();
  const orgId = params.id as string;
  return <SuppliersClient organizationId={orgId} />;
}
