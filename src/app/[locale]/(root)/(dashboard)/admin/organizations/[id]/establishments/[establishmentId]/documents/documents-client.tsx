"use client";

import { useParams } from "next/navigation";

import { DocumentsList } from "@/app/[locale]/(root)/(dashboard)/_components/documents/documents-list";

export function DocumentsClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  const locale = params.locale as string;

  return (
    <DocumentsList
      organizationId={organizationId}
      establishmentId={establishmentId}
      detailBaseUrl={`/${locale}/admin/organizations/${organizationId}/establishments/${establishmentId}/documents`}
    />
  );
}
