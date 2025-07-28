import Link from "next/link";

import { Button } from "@/components/ui/button";

// Composant pour l'état de chargement général
export function LoadingState({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground mt-4">{message}</p>
      </div>
    </div>
  );
}

// Composant pour l'état d'erreur général
export function ErrorState({
  establishmentSlug,
  title = "Erreur",
  message = "Impossible de charger les informations de réservation.",
}: {
  establishmentSlug?: string | null;
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-destructive mb-4 text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Link href={`/${establishmentSlug ?? ""}/booking`}>
          <Button>Retour à la sélection de date</Button>
        </Link>
      </div>
    </div>
  );
}

// Composant pour l'état de chargement des créneaux
export function SlotsLoadingState() {
  return <LoadingState message="Chargement des créneaux..." />;
}

// Composant pour l'état de chargement de la confirmation
export function ConfirmationLoadingState() {
  return <LoadingState message="Chargement de la confirmation..." />;
}
