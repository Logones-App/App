"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EstablishmentGallerySharedProps {
  establishmentId: string;
  organizationId: string;
}

export function EstablishmentGalleryShared({ establishmentId, organizationId }: EstablishmentGallerySharedProps) {
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
      <h2>Galerie photo de l'établissement</h2>
      <p>Établissement ID : {establishmentId}</p>
      <p>Organisation ID : {organizationId}</p>
      {/* À implémenter : affichage, ajout, suppression de photos */}
    </div>
  );
}
