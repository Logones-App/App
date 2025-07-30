import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface Booking {
  id: string;
  establishment_id: string;
  date: string;
  time: string;
  service_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_guests: number;
  special_requests: string | null;
  status: string;
  created_at: string;
}

// Fonction pour récupérer l'établissement par slug
export async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  try {
    console.log("🔍 Recherche de l'établissement avec le slug:", slug);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("establishments")
      .select(
        `
        id,
        name,
        slug,
        description,
        address,
        phone,
        email,
        logo_url,
        cover_image_url,
        website,
        is_public,
        created_at,
        updated_at,
        deleted
      `,
      )
      .eq("slug", slug)
      .eq("deleted", false)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération de l'établissement:", error);
      return null;
    }

    if (!data) {
      console.log("⚠️ Aucun établissement trouvé avec le slug:", slug);
      return null;
    }

    // Vérifier si l'établissement est public
    if (!data.is_public) {
      console.log("🚫 Établissement non public:", data.name);
      return null;
    }

    console.log("✅ Établissement trouvé:", data.name);
    return data as Establishment;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération de l'établissement:", error);
    return null;
  }
}

// Fonction pour récupérer une réservation
export async function getBooking(bookingId: string): Promise<Booking | null> {
  try {
    console.log("🔍 Recherche de la réservation:", bookingId);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("deleted", false)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération de la réservation:", error);
      return null;
    }

    if (!data) {
      console.log("⚠️ Aucune réservation trouvée avec l'ID:", bookingId);
      return null;
    }

    console.log("✅ Réservation trouvée:", data.id);
    return data as Booking;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération de la réservation:", error);
    return null;
  }
}

// Fonction pour récupérer une réservation avec token de confirmation
export async function getBookingWithToken(bookingId: string, confirmationToken: string): Promise<Booking | null> {
  try {
    console.log("🔍 Recherche de la réservation avec token:", bookingId);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("confirmation_token", confirmationToken)
      .gt("token_expires_at", new Date().toISOString())
      .eq("status", "confirmed")
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération de la réservation avec token:", error);
      return null;
    }

    if (!data) {
      console.log("⚠️ Aucune réservation trouvée avec l'ID et le token:", bookingId);
      return null;
    }

    console.log("✅ Réservation trouvée avec token valide:", data.id);
    return data as Booking;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération de la réservation:", error);
    return null;
  }
}

// Fonction pour créer une réservation
export async function createBooking(
  establishmentId: string,
  organizationId: string,
  date: string,
  time: string,
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfGuests: number;
    specialRequests: string;
  },
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
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

    console.log("✅ Réservation créée avec succès:", data.booking.id);
    return { success: true, bookingId: data.booking.id };
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la création de la réservation:", error);
    return { success: false, error: "Erreur inattendue" };
  }
}
