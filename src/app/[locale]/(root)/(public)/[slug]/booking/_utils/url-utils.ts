import { Tables } from "@/lib/supabase/database.types";

import { isCustomDomain } from "./domain-utils";

type Establishment = Tables<"establishments">;

/**
 * Utilitaires pour la gestion des URLs
 * Centralise la logique de génération d'URLs selon le type de domaine
 */

/**
 * Génère l'URL de succès selon le type de domaine
 * @param establishment - L'établissement
 * @param bookingId - L'ID de la réservation (optionnel)
 * @returns L'URL de succès appropriée
 */
export const generateSuccessUrl = (establishment: Establishment, bookingId?: string): string => {
  const customDomain = isCustomDomain();

  if (customDomain) {
    return bookingId ? `/booking/success?bookingId=${bookingId}` : `/booking/success`;
  }

  return bookingId
    ? `/${establishment.slug}/booking/success?bookingId=${bookingId}`
    : `/${establishment.slug}/booking/success`;
};

/**
 * Génère l'URL de confirmation selon le type de domaine
 * @param establishment - L'établissement
 * @param date - La date formatée (YYYY-MM-DD)
 * @param time - L'heure formatée (HH-MM)
 * @returns L'URL de confirmation appropriée
 */
export const generateConfirmUrl = (establishment: Establishment, date: string, time: string): string => {
  const customDomain = isCustomDomain();

  if (customDomain) {
    return `/booking/confirm/${date}/${time}`;
  }

  return `/${establishment.slug}/booking/confirm/${date}/${time}`;
};

/**
 * Génère l'URL de retour vers l'établissement
 * @param establishment - L'établissement
 * @returns L'URL de retour appropriée
 */
export const generateBackToEstablishmentUrl = (establishment: Establishment): string => {
  const customDomain = isCustomDomain();

  if (customDomain) {
    return `/`;
  }

  return `/${establishment.slug}`;
};

/**
 * Génère l'URL de retour vers la sélection de créneaux
 * @param establishment - L'établissement
 * @param date - La date formatée (YYYY-MM-DD)
 * @returns L'URL de retour appropriée
 */
export const generateBackToSlotsUrl = (establishment: Establishment, date: string): string => {
  const customDomain = isCustomDomain();

  if (customDomain) {
    return `/booking/slots/${date}`;
  }

  return `/${establishment.slug}/booking/slots/${date}`;
};

/**
 * Génère l'URL de retour vers la sélection de date
 * @param establishment - L'établissement
 * @returns L'URL de retour appropriée
 */
export const generateBackToBookingUrl = (establishment: Establishment): string => {
  const customDomain = isCustomDomain();

  if (customDomain) {
    return `/booking`;
  }

  return `/${establishment.slug}/booking`;
};

/**
 * Log les URLs générées pour le debug
 */
export const logUrlGeneration = (
  type: "success" | "confirm" | "back" | "slots" | "booking",
  establishment: Establishment,
  params?: any,
): void => {
  console.log(`🚀 Génération URL ${type}:`, {
    establishment: establishment.slug,
    domainType: isCustomDomain() ? "custom" : "main",
    params,
  });
};
