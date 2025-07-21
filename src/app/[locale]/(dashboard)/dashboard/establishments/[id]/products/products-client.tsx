"use client";
import { useParams } from "next/navigation";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { ProductsShared } from "@/app/[locale]/(dashboard)/_components/establishments/products-shared";
export function ProductsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();
  return <ProductsShared establishmentId={establishmentId} organizationId={organizationId || ""} />;
}
