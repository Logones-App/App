"use client";
import { useParams } from "next/navigation";

import { MenusShared } from "@/app/[locale]/(dashboard)/_components/establishments/menus-shared";

export function MenusClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  return <MenusShared establishmentId={establishmentId} organizationId={organizationId} />;
}
