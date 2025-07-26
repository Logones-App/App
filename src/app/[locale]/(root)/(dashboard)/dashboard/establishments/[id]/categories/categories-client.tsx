"use client";
import { useParams } from "next/navigation";

import { CategoriesShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/categories-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function CategoriesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <CategoriesShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
