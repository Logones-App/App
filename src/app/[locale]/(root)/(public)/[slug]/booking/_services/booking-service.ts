import { BookingFormData } from "../_utils/validation-utils";

/**
 * Interface pour la réponse de création de réservation
 */
export interface BookingApiResponse {
  success: boolean;
  bookingId?: string;
  bookingData?: any;
  error?: string;
  message?: string;
}

/**
 * Interface pour les données de réservation
 */
export interface BookingData {
  id: string;
  establishment_id: string;
  date: string;
  time: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_guests: number;
  special_requests: string | null;
  status: string;
  created_at: string;
}

/**
 * Service centralisé pour la gestion des réservations
 * Centralise toutes les opérations liées aux réservations
 */
export class BookingService {
  /**
   * Crée une nouvelle réservation
   * @param establishmentId - L'ID de l'établissement
   * @param organizationId - L'ID de l'organisation
   * @param date - La date de réservation
   * @param time - L'heure de réservation
   * @param formData - Les données du formulaire
   * @returns La réponse de création
   */
  static async create(
    establishmentId: string,
    organizationId: string,
    date: string,
    time: string,
    formData: BookingFormData,
  ): Promise<BookingApiResponse> {
    try {
      console.log("🚀 Création de la réservation:", { establishmentId, date, time, formData });

      // Appeler l'API Route pour créer la réservation
      const response = await fetch("/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          establishmentId,
          date,
          time,
          customerFirstName: formData.firstName,
          customerLastName: formData.lastName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          numberOfGuests: formData.numberOfGuests,
          specialRequests: formData.specialRequests ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Erreur lors de la création de la réservation:", data.error);
        return { success: false, error: data.error ?? "Erreur lors de la création de la réservation" };
      }

      console.log("✅ Réservation créée avec succès:", data.bookingData?.id);
      return {
        success: true,
        bookingId: data.bookingData?.id,
        bookingData: data.bookingData,
      };
    } catch (error) {
      console.error("💥 Erreur inattendue lors de la création de la réservation:", error);
      return { success: false, error: "Erreur inattendue" };
    }
  }

  /**
   * Récupère une réservation par son ID
   * @param bookingId - L'ID de la réservation
   * @returns Les données de réservation ou null
   */
  static async getById(bookingId: string): Promise<BookingData | null> {
    try {
      console.log("🔍 Recherche de la réservation:", bookingId);

      const response = await fetch(`/api/booking/${bookingId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("❌ Erreur lors de la récupération de la réservation:", response.status);
        return null;
      }

      const data = await response.json();

      if (!data.success || !data.booking) {
        return null;
      }

      console.log("✅ Réservation trouvée:", data.booking.id);
      return data.booking as BookingData;
    } catch (error) {
      console.error("💥 Erreur inattendue lors de la récupération de la réservation:", error);
      return null;
    }
  }

  /**
   * Vérifie un token de réservation sécurisé
   * @param token - Le token sécurisé
   * @returns Les données de réservation ou null
   */
  static async verifyToken(token: string): Promise<BookingData | null> {
    try {
      console.log("🔍 Vérification du token:", token);

      const response = await fetch("/api/booking/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.error("❌ Erreur lors de la vérification du token:", response.status);
        return null;
      }

      const data = await response.json();

      if (!data.success || !data.booking) {
        return null;
      }

      console.log("✅ Token vérifié, réservation trouvée:", data.booking.id);
      return data.booking as BookingData;
    } catch (error) {
      console.error("💥 Erreur inattendue lors de la vérification du token:", error);
      return null;
    }
  }

  /**
   * Génère un token sécurisé pour une réservation
   * @param bookingId - L'ID de la réservation
   * @param establishmentId - L'ID de l'établissement
   * @returns Le token sécurisé
   */
  static generateSecureToken(bookingId: string, establishmentId: string): string {
    const timestamp = Date.now();
    const token = btoa(`${bookingId}:${timestamp}:${establishmentId}`);
    console.log("🔐 Token sécurisé généré:", { bookingId, establishmentId, timestamp });
    return token;
  }

  /**
   * Valide un token sécurisé
   * @param token - Le token à valider
   * @returns Les données décodées ou null si invalide
   */
  static validateSecureToken(token: string): { bookingId: string; timestamp: number; establishmentId: string } | null {
    try {
      const decoded = atob(token);
      const [bookingId, timestamp, establishmentId] = decoded.split(":");

      if (!bookingId || !timestamp || !establishmentId) {
        console.error("❌ Token invalide: données manquantes");
        return null;
      }

      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 15 * 60 * 1000; // 15 minutes

      if (tokenAge > maxAge) {
        console.error("❌ Token expiré:", { tokenAge, maxAge });
        return null;
      }

      console.log("✅ Token valide:", { bookingId, establishmentId, tokenAge });
      return { bookingId, timestamp: parseInt(timestamp), establishmentId };
    } catch (error) {
      console.error("❌ Erreur lors de la validation du token:", error);
      return null;
    }
  }
}
