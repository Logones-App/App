import Link from "next/link";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

// Composant pour l'état de chargement général
export function LoadingState({ message }: { message?: string }) {
  const t = useTranslations("Booking");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground mt-4">{message ?? t("page.loading")}</p>
      </div>
    </div>
  );
}

// Composant pour l'état d'erreur général
export function ErrorState({
  establishmentSlug,
  title,
  message,
}: {
  establishmentSlug?: string | null;
  title?: string;
  message?: string;
}) {
  const t = useTranslations("Booking");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-destructive mb-4 text-2xl font-bold">{title ?? t("page.not_found.title")}</h1>
        <p className="text-muted-foreground mb-4">{message ?? t("page.not_found.description")}</p>
        <Link href={`/${establishmentSlug ?? ""}/booking`}>
          <Button>{t("page.back")}</Button>
        </Link>
      </div>
    </div>
  );
}

// Composant pour l'état de chargement des créneaux
export function SlotsLoadingState() {
  const t = useTranslations("Booking");
  return <LoadingState message={t("slots.loading")} />;
}

// Composant pour l'état de chargement de la confirmation
export function ConfirmationLoadingState() {
  const t = useTranslations("Booking");
  return <LoadingState message={t("confirm.loading")} />;
}
