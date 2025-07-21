"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { CategoriesShared } from "@/app/[locale]/(dashboard)/_components/establishments/categories-shared";
export function CategoriesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <CategoriesShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
