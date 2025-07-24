"use client";
import { useParams } from "next/navigation";

import { CategoriesShared } from "@/app/[locale]/(dashboard)/_components/establishments/categories-shared";

export function CategoriesClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <CategoriesShared establishmentId={establishmentId} organizationId={organizationId} />;
}
