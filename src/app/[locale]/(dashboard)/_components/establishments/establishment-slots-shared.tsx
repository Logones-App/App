"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EstablishmentSlotsSharedProps {
  establishmentId: string;
  organizationId: string;
}

export function EstablishmentSlotsShared({ establishmentId, organizationId }: EstablishmentSlotsSharedProps) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");
  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backLink}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'établissement
          </Button>
        </Link>
      </div>
      <h2>Créneaux horaires de l'établissement</h2>
      <p>Établissement ID : {establishmentId}</p>
      <p>Organisation ID : {organizationId}</p>
      {/* À implémenter : liste, ajout, édition, suppression des créneaux horaires */}
    </div>
  );
}
