// Types pour la validation
export interface BookingRequest {
  establishmentId: string;
  date: string;
  time: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  numberOfGuests: number;
  specialRequests?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Fonction pour valider un champ requis
function validateRequiredField(value: string | undefined, fieldName: string): string[] {
  const errors: string[] = [];
  if (!value?.trim()) {
    errors.push(`${fieldName} requis`);
  }
  return errors;
}

// Fonction pour valider les champs requis
function validateRequiredFields(data: BookingRequest): string[] {
  const errors: string[] = [];

  errors.push(...validateRequiredField(data.establishmentId, "ID de l'établissement"));
  errors.push(...validateRequiredField(data.date, "Date de réservation"));
  errors.push(...validateRequiredField(data.time, "Heure de réservation"));
  errors.push(...validateRequiredField(data.customerFirstName, "Prénom du client"));
  errors.push(...validateRequiredField(data.customerLastName, "Nom du client"));
  errors.push(...validateRequiredField(data.customerEmail, "Email du client"));
  errors.push(...validateRequiredField(data.customerPhone, "Téléphone du client"));

  return errors;
}

// Fonction pour valider le nombre de personnes
function validateNumberOfGuests(numberOfGuests: number): string[] {
  const errors: string[] = [];

  if (!numberOfGuests || numberOfGuests < 1 || numberOfGuests > 50) {
    errors.push("Le nombre de personnes doit être entre 1 et 50");
  }

  return errors;
}

// Fonction pour valider l'email
function validateEmail(email: string): string[] {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push("Format d'email invalide");
  }

  return errors;
}

// Fonction pour valider le téléphone
function validatePhone(phone: string): string[] {
  const errors: string[] = [];

  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  if (phone && !phoneRegex.test(phone.replace(/\s/g, ""))) {
    errors.push("Format de téléphone invalide");
  }

  return errors;
}

// Fonction pour valider la date
function validateDate(date: string): string[] {
  const errors: string[] = [];

  if (date) {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      errors.push("La date de réservation doit être dans le futur");
    }
  }

  return errors;
}

// Fonction principale pour valider une demande de réservation
export function validateBookingRequest(data: BookingRequest): ValidationResult {
  const errors: string[] = [];

  // Valider les champs requis
  errors.push(...validateRequiredFields(data));

  // Valider le nombre de personnes
  errors.push(...validateNumberOfGuests(data.numberOfGuests));

  // Valider l'email
  errors.push(...validateEmail(data.customerEmail));

  // Valider le téléphone
  errors.push(...validatePhone(data.customerPhone));

  // Valider la date
  errors.push(...validateDate(data.date));

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Fonction pour valider les paramètres de requête pour les créneaux
export function validateSlotsRequest(establishmentId: string, date: string): ValidationResult {
  const errors: string[] = [];

  if (!establishmentId?.trim()) {
    errors.push("ID de l'établissement requis");
  }

  if (!date?.trim()) {
    errors.push("Date requise");
  }

  // Validation du format de date
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (date && !dateRegex.test(date)) {
    errors.push("Format de date invalide (YYYY-MM-DD attendu)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
