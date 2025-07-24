"use client";
import { useParams } from "next/navigation";

import { ProductsShared } from "@/app/[locale]/(dashboard)/_components/establishments/products-shared";

export function ProductsClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <ProductsShared establishmentId={establishmentId} organizationId={organizationId} />;
}
