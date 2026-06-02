"use client";

import { useParams } from "next/navigation";

import { DocumentMatchingPanel } from "@/app/[locale]/(root)/(dashboard)/_components/documents/document-matching-panel";

export function DocumentMatchingClientAdmin() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;
  const docId = params.docId as string;
  const locale = params.locale as string;

  return (
    <DocumentMatchingPanel
      docId={docId}
      organizationId={organizationId}
      establishmentId={establishmentId}
      backUrl={`/${locale}/admin/organizations/${organizationId}/establishments/${establishmentId}/documents/${docId}`}
    />
  );
}
