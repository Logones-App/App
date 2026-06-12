import { type BookingData } from "@/lib/stores/booking-confirmation-store";
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

export async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("establishments")
    .select(
      "id, name, slug, description, address, phone, email, logo_url, cover_image_url, website, is_public, created_at, updated_at, deleted",
    )
    .eq("slug", slug)
    .eq("deleted", false)
    .single();

  if (error) return null;
  if (!data.is_public) return null;
  return data as Establishment;
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).eq("deleted", false).single();

  if (error) return null;
  return data as Booking;
}

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
): Promise<{ success: boolean; bookingId?: string; bookingData?: BookingData; error?: string }> {
  try {
    const response = await fetch("/api/booking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishmentId,
        date,
        time,
        customerFirstName: formData.firstName,
        customerLastName: formData.lastName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        numberOfGuests: formData.numberOfGuests,
        specialRequests: formData.specialRequests,
      }),
    });

    const raw = (await response.json()) as { error?: string; bookingData?: BookingData };

    if (!response.ok) {
      return { success: false, error: raw.error ?? "Erreur lors de la création de la réservation" };
    }

    return { success: true, bookingId: raw.bookingData?.id, bookingData: raw.bookingData };
  } catch {
    return { success: false, error: "Erreur inattendue" };
  }
}
