import React from "react";

import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface BookingLayoutProps {
  establishment: Establishment | null;
  children: React.ReactNode;
  backUrl?: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
}

/**
 * Layout réutilisable pour toutes les pages de réservation
 * Centralise la structure commune et la gestion des états
 */
export const BookingLayout: React.FC<BookingLayoutProps> = ({
  establishment,
  children,
  backUrl,
  title,
  subtitle,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Erreur</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">🏪</div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Établissement non trouvé</h1>
            <p className="text-muted-foreground">
              L&apos;établissement demandé n&apos;existe pas ou n&apos;est pas accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <BookingHeader establishment={establishment} backUrl={backUrl} title={title} subtitle={subtitle} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
};

interface BookingHeaderProps {
  establishment: Establishment;
  backUrl?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Header réutilisable pour les pages de réservation
 */
const BookingHeader: React.FC<BookingHeaderProps> = ({ establishment, backUrl, title, subtitle }) => {
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            {backUrl && (
              <a
                href={backUrl}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </a>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {title ?? "Réservation"} - {establishment.name}
              </h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
