"use client";
import { useParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { ProductsShared } from "@/app/[locale]/(dashboard)/_components/establishments/products-shared";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function ProductsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  // Attendre que organizationId soit disponible
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de l'organisation...</span>
      </div>
    );
  }

  return <ProductsShared establishmentId={establishmentId} organizationId={organizationId} />;
}
