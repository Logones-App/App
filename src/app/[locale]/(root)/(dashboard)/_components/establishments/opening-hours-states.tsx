"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

// Composant pour l'état de chargement
export function OpeningHoursLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p>Chargement des horaires...</p>
      </div>
    </div>
  );
}

// Composant pour l'état d'erreur
export function OpeningHoursError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>Erreur lors du chargement des horaires: {error}</AlertDescription>
    </Alert>
  );
}

// Composant pour l'état de déconnexion
export function OpeningHoursDisconnected() {
  return (
    <Alert>
      <AlertDescription>Connexion perdue. Tentative de reconnexion...</AlertDescription>
    </Alert>
  );
}
