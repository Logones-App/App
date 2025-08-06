"use client";

import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

// Composant pour l'état de chargement
export function ProductsLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        <p>Chargement des produits...</p>
      </div>
    </div>
  );
}

// Composant pour l'état d'erreur
export function ProductsError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>Erreur lors du chargement des produits: {error}</AlertDescription>
    </Alert>
  );
}
