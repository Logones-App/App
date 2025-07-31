/**
 * Utilitaires pour la validation des formulaires
 * Centralise la logique de validation des données de réservation
 */

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfGuests: number;
  specialRequests: string;
}

/**
 * Valide le formulaire de réservation
 * @param formData - Les données du formulaire
 * @param t - Fonction de traduction
 * @returns Message d'erreur ou null si valide
 */
export const validateBookingForm = (formData: BookingFormData, t: any): string | null => {
  // Validation du prénom
  if (!formData.firstName.trim()) {
    return t("validation.first_name_required");
  }

  // Validation du nom
  if (!formData.lastName.trim()) {
    return t("validation.last_name_required");
  }

  // Validation de l'email
  if (!formData.email.trim()) {
    return t("validation.email_required");
  }

  // Validation du téléphone
  if (!formData.phone.trim()) {
    return t("validation.phone_required");
  }

  // Validation du nombre de personnes
  if (formData.numberOfGuests < 1 || formData.numberOfGuests > 50) {
    return t("validation.number_of_guests_min") + " - " + t("validation.number_of_guests_max");
  }

  // Validation email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    return t("validation.email_invalid");
  }

  // Validation du téléphone (format basique)
  const phoneRegex = /^[+]?[0-9\s\-()]{8,}$/;
  if (!phoneRegex.test(formData.phone)) {
    return t("validation.phone_invalid");
  }

  return null;
};

/**
 * Valide une date de réservation
 * @param date - La date à valider
 * @returns true si la date est valide, false sinon
 */
export const validateBookingDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today;
};

/**
 * Valide une heure de réservation
 * @param time - L'heure à valider (format HH:MM)
 * @returns true si l'heure est valide, false sinon
 */
export const validateBookingTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Valide un nombre de personnes
 * @param numberOfGuests - Le nombre de personnes
 * @returns true si valide, false sinon
 */
export const validateNumberOfGuests = (numberOfGuests: number): boolean => {
  return numberOfGuests >= 1 && numberOfGuests <= 50;
};

/**
 * Nettoie et valide un numéro de téléphone
 * @param phone - Le numéro de téléphone
 * @returns Le numéro nettoyé ou null si invalide
 */
export const cleanAndValidatePhone = (phone: string): string | null => {
  // Supprimer les espaces et caractères spéciaux
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Vérifier que c'est un numéro valide
  if (/^[+]?[0-9]{8,}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
};

/**
 * Nettoie et valide un email
 * @param email - L'email
 * @returns L'email nettoyé ou null si invalide
 */
export const cleanAndValidateEmail = (email: string): string | null => {
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
};

/**
 * Log les erreurs de validation pour le debug
 */
export const logValidationError = (field: string, value: any, error: string): void => {
  console.log("❌ Erreur de validation:", {
    field,
    value,
    error,
  });
};
