import { useState } from "react";

import { BookingFormData, validateBookingForm, logValidationError } from "../_utils/validation-utils";

interface UseBookingFormOptions {
  initialData?: Partial<BookingFormData>;
  onSubmit?: (formData: BookingFormData) => Promise<void>;
  onError?: (error: string) => void;
}

interface UseBookingFormReturn {
  formData: BookingFormData;
  setFormData: (data: BookingFormData) => void;
  updateField: (field: keyof BookingFormData, value: any) => void;
  error: string | null;
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
  isValid: boolean;
}

/**
 * Hook personnalisé pour la gestion du formulaire de réservation
 * Centralise la logique de validation et de soumission
 */
export const useBookingForm = ({ initialData, onSubmit, onError }: UseBookingFormOptions): UseBookingFormReturn => {
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: 2,
    specialRequests: "",
    ...initialData,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation en temps réel
  const validateForm = (data: BookingFormData = formData): boolean => {
    // Validation basique pour l'interface
    return !!(
      data.firstName.trim() &&
      data.lastName.trim() &&
      data.email.trim() &&
      data.phone.trim() &&
      data.numberOfGuests >= 1 &&
      data.numberOfGuests <= 50
    );
  };

  const updateField = (field: keyof BookingFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Log pour debug
    console.log(`📝 Mise à jour champ ${field}:`, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 Soumission du formulaire:", formData);

    // Validation complète
    const validationError = validateBookingForm(formData, (key: string) => {
      // Mock de traduction pour la validation
      const translations: Record<string, string> = {
        "validation.first_name_required": "Le prénom est requis",
        "validation.last_name_required": "Le nom est requis",
        "validation.email_required": "L'email est requis",
        "validation.phone_required": "Le téléphone est requis",
        "validation.number_of_guests_min": "Minimum 1 personne",
        "validation.number_of_guests_max": "Maximum 50 personnes",
        "validation.email_invalid": "Format d'email invalide",
        "validation.phone_invalid": "Format de téléphone invalide",
      };
      return translations[key] || key;
    });

    if (validationError) {
      console.error("❌ Erreur de validation:", validationError);
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit?.(formData);
      console.log("✅ Formulaire soumis avec succès");
    } catch (err) {
      const errorMsg = "Erreur lors de la soumission du formulaire";
      console.error("❌", errorMsg, err);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      numberOfGuests: 2,
      specialRequests: "",
      ...initialData,
    });
    setError(null);
    setSubmitting(false);
    console.log("🔄 Formulaire réinitialisé");
  };

  return {
    formData,
    setFormData,
    updateField,
    error,
    submitting,
    handleSubmit,
    reset,
    isValid: validateForm(),
  };
};
