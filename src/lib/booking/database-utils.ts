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
): Promise<{ success: boolean; bookingId?: string; bookingData?: any; error?: string }> {
  try {
    console.log("🚀 Création de la réservation pour l'établissement:", establishmentId);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        establishment_id: establishmentId,
        organization_id: organizationId,
        date,
        time,
        service_name: "Réservation standard",
        customer_first_name: formData.firstName,
        customer_last_name: formData.lastName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        number_of_guests: formData.numberOfGuests,
        special_requests: formData.specialRequests || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la création de la réservation:", error);
      return {
        success: false,
        error: "Erreur lors de la création de la réservation",
      };
    }

    console.log("✅ Réservation créée avec succès:", data.id);

    // Récupérer les données complètes de l'établissement
    const establishment = await getEstablishmentBySlug(data.establishment_id);

    const bookingData = {
      id: data.id,
      establishment_id: data.establishment_id,
      date: data.date,
      time: data.time,
      service_name: data.service_name,
      customer_first_name: data.customer_first_name,
      customer_last_name: data.customer_last_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      number_of_guests: data.number_of_guests,
      special_requests: data.special_requests,
      status: data.status,
      created_at: data.created_at,
      establishment: establishment,
    };

    return {
      success: true,
      bookingId: data.id,
      bookingData,
    };
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la création de la réservation:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la création de la réservation",
    };
  }
}
