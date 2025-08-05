"use client";

import React from "react";

import { BookingExceptionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/booking-exceptions-shared";
import { useUserMetadata } from "@/hooks/use-user-metadata";

interface BookingExceptionsPageProps {
  params: Promise<{
    id: string; // organizationId
    establishmentId: string;
  }>;
}

export default function BookingExceptionsPage({ params }: BookingExceptionsPageProps) {
  const { isSystemAdmin } = useUserMetadata();
  const { id, establishmentId } = React.use(params);

  // Vérifier les permissions
  if (!isSystemAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return <BookingExceptionsShared establishmentId={establishmentId} organizationId={id} />;
}
