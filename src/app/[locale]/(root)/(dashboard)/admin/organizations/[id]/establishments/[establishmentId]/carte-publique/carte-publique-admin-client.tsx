"use client";

import { useParams } from "next/navigation";

import { PublicMenuEditorShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/public-menu-editor-shared";

export function CartePubliqueAdminClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <PublicMenuEditorShared establishmentId={establishmentId} organizationId={organizationId} />;
}
