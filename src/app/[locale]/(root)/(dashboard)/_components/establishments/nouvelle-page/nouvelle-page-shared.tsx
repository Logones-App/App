"use client";

import React from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";

interface NouvellePageSharedProps {
  establishmentId: string;
  organizationId?: string; // Seulement pour admin
  isAdmin: boolean;
}

export function NouvellePageShared({ establishmentId, organizationId, isAdmin }: NouvellePageSharedProps) {
  const { user, userRole } = useAuthStore();

  // Vérification des permissions
  if (!user) {
    return <div>Non autorisé</div>;
  }

  // Logique différente selon le type d'accès
  const pageTitle = isAdmin
    ? `Admin - Établissement ${establishmentId} (Orga: ${organizationId})`
    : `Mon Établissement - ${establishmentId}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{pageTitle}</h1>
      <p>Type d&apos;accès: {isAdmin ? "Admin" : "Dashboard"}</p>
      <p>Établissement ID: {establishmentId}</p>
      {isAdmin && organizationId && <p>Organisation ID: {organizationId}</p>}
      <Button>Action</Button>
    </div>
  );
}
