"use client";

import React from "react";

import { BookingExceptionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/booking-exceptions-shared";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

interface BookingExceptionsPageProps {
  params: Promise<{
    id: string; // establishmentId
  }>;
}

export default function BookingExceptionsPage({ params }: BookingExceptionsPageProps) {
  const { isOrgAdmin } = useUserMetadata();
  const organizationId = useOrgaUserOrganizationId();
  const { id } = React.use(params);

  // Vérifier les permissions
  if (!isOrgAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Affichage de chargement pour l'organizationId
  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Chargement de l'organisation...</p>
          </div>
        </div>
      </div>
    );
  }

  return <BookingExceptionsShared establishmentId={id} organizationId={organizationId} />;
}
