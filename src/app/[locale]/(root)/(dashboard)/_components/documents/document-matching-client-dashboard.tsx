"use client";

import { useParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { DocumentMatchingPanel } from "@/app/[locale]/(root)/(dashboard)/_components/documents/document-matching-panel";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

export function DocumentMatchingClientDashboard() {
  const params = useParams();
  const establishmentId = params.id as string;
  const docId = params.docId as string;
  const locale = params.locale as string;
  const organizationId = useOrgaUserOrganizationId();

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <DocumentMatchingPanel
      docId={docId}
      organizationId={organizationId}
      establishmentId={establishmentId}
      backUrl={`/${locale}/dashboard/establishments/${establishmentId}/documents/${docId}`}
    />
  );
}
