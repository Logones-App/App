"use client";

import { useParams } from "next/navigation";

import { ProductOptionGroupsConfig } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/product-option-groups-config";

export function OptionsClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <ProductOptionGroupsConfig establishmentId={establishmentId} organizationId={organizationId} />;
}
