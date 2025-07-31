/**
 * Utilitaires pour la gestion des paramètres
 * Centralise la logique d'extraction et de validation des paramètres
 */

/**
 * Interface pour les paramètres de réservation
 */
export interface BookingParams {
  slug?: string;
  establishmentSlug?: string;
  "establishment-slug"?: string;
  locale: string;
  date?: string;
  time?: string;
}

/**
 * Extrait le slug de l'établissement depuis les paramètres
 * @param params - Les paramètres de la route
 * @returns Le slug de l'établissement ou null
 */
export const extractEstablishmentSlug = (params: any): string | null => {
  return params.slug ?? params["establishment-slug"] ?? params.establishmentSlug ?? null;
};

/**
 * Extrait la date depuis les paramètres
 * @param params - Les paramètres de la route
 * @returns La date ou null
 */
export const extractDate = (params: any): string | null => {
  return params.date ?? null;
};

/**
 * Extrait l'heure depuis les paramètres
 * @param params - Les paramètres de la route
 * @returns L'heure ou null
 */
export const extractTime = (params: any): string | null => {
  return params.time ?? null;
};

/**
 * Extrait tous les paramètres de réservation
 * @param params - Les paramètres de la route
 * @returns Un objet avec tous les paramètres
 */
export const extractBookingParams = (params: any): BookingParams => {
  return {
    slug: params.slug,
    establishmentSlug: params.establishmentSlug,
    "establishment-slug": params["establishment-slug"],
    locale: params.locale,
    date: params.date,
    time: params.time,
  };
};

/**
 * Valide les paramètres de réservation
 * @param params - Les paramètres à valider
 * @returns true si valides, false sinon
 */
export const validateBookingParams = (params: BookingParams): boolean => {
  const establishmentSlug = extractEstablishmentSlug(params);

  if (!establishmentSlug) {
    console.error("❌ Slug d'établissement manquant");
    return false;
  }

  if (!params.locale) {
    console.error("❌ Locale manquante");
    return false;
  }

  return true;
};

/**
 * Valide les paramètres pour la page de confirmation
 * @param params - Les paramètres à valider
 * @returns true si valides, false sinon
 */
export const validateConfirmParams = (params: BookingParams): boolean => {
  if (!validateBookingParams(params)) {
    return false;
  }

  if (!params.date) {
    console.error("❌ Date manquante pour la confirmation");
    return false;
  }

  if (!params.time) {
    console.error("❌ Heure manquante pour la confirmation");
    return false;
  }

  return true;
};

/**
 * Valide les paramètres pour la page de créneaux
 * @param params - Les paramètres à valider
 * @returns true si valides, false sinon
 */
export const validateSlotsParams = (params: BookingParams): boolean => {
  if (!validateBookingParams(params)) {
    return false;
  }

  if (!params.date) {
    console.error("❌ Date manquante pour les créneaux");
    return false;
  }

  return true;
};

/**
 * Nettoie et formate l'heure depuis les paramètres
 * @param time - L'heure au format HH-MM
 * @returns L'heure au format HH:MM
 */
export const formatTimeFromParams = (time: string): string => {
  return time.replace("-", ":");
};

/**
 * Nettoie et formate l'heure pour les paramètres
 * @param time - L'heure au format HH:MM
 * @returns L'heure au format HH-MM
 */
export const formatTimeForParams = (time: string): string => {
  return time.replace(":", "-");
};

/**
 * Log les paramètres extraits pour le debug
 */
export const logParamsExtraction = (params: any, type: string): void => {
  console.log(`🔍 Extraction paramètres ${type}:`, {
    establishmentSlug: extractEstablishmentSlug(params),
    date: extractDate(params),
    time: extractTime(params),
    locale: params.locale,
  });
};
