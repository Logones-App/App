"use client";

import React from "react";

import { useUserMetadata } from "@/hooks/use-user-metadata";

import { BookingExceptionsShared } from "../../../../../../_components/establishments/booking-exceptions-shared";

export default function AdminBookingExceptionsPage() {
  const { isSystemAdmin } = useUserMetadata();

  // Vérifier que l'utilisateur est un System Admin
  if (!isSystemAdmin) {
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

  // Mock des IDs pour l'UX
  const mockEstablishmentId = "est-123";
  const mockOrganizationId = "org-456";

  return <BookingExceptionsShared establishmentId={mockEstablishmentId} organizationId={mockOrganizationId} />;
}
