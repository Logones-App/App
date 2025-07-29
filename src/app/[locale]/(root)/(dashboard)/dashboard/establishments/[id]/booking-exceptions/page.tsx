"use client";

import React from "react";

import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

import { BookingExceptionsShared } from "../../../../_components/establishments/booking-exceptions-shared";

export default function DashboardBookingExceptionsPage() {
  const { isOrgAdmin } = useUserMetadata();
  const organizationId = useOrgaUserOrganizationId();

  // Vérifier que l'utilisateur est un Org Admin
  if (!isOrgAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-destructive text-2xl font-bold">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Attendre que l'organizationId soit chargé
  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Chargement...</h2>
            <p className="text-muted-foreground">Chargement de votre organisation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mock de l'establishmentId pour l'UX
  const mockEstablishmentId = "est-789";

  return <BookingExceptionsShared establishmentId={mockEstablishmentId} organizationId={organizationId} />;
}
