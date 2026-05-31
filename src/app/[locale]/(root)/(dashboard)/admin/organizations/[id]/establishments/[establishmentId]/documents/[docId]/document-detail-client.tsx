"use client";

import { useParams } from "next/navigation";

import { DocumentDetailPanel } from "@/app/[locale]/(root)/(dashboard)/_components/documents/document-detail-panel";

export function DocumentDetailClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  const docId = params.docId as string;
  const locale = params.locale as string;

  return (
    <DocumentDetailPanel
      docId={docId}
      backUrl={`/${locale}/admin/organizations/${organizationId}/establishments/${establishmentId}/documents`}
    />
  );
}
