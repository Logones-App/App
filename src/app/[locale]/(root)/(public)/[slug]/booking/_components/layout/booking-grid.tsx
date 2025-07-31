import React from "react";

import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface BookingGridProps {
  establishment: Establishment;
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
  className?: string;
}

/**
 * Grid réutilisable pour les pages de réservation
 * Centralise la mise en page en 2 colonnes
 */
export const BookingGrid: React.FC<BookingGridProps> = ({ leftColumn, rightColumn, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 gap-8 lg:grid-cols-3 ${className}`}>
      {/* Colonne de gauche - Informations */}
      <div className="lg:col-span-1">{leftColumn}</div>

      {/* Colonne de droite - Contenu principal */}
      <div className="lg:col-span-2">{rightColumn}</div>
    </div>
  );
};

interface BookingCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Carte réutilisable pour les sections de réservation
 */
export const BookingCard: React.FC<BookingCardProps> = ({ children, title, subtitle, icon, className = "" }) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      {(title ?? icon) && (
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            {icon && <div className="text-primary">{icon}</div>}
            {title && (
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

interface BookingSectionProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Section réutilisable pour les pages de réservation
 */
export const BookingSection: React.FC<BookingSectionProps> = ({ children, title, subtitle, icon, className = "" }) => {
  return (
    <BookingCard title={title} subtitle={subtitle} icon={icon} className={className}>
      {children}
    </BookingCard>
  );
};
