import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

// Fonction pour extraire le slug de l'établissement
export const getEstablishmentSlug = (resolvedParams: any): string | null => {
  return resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug ?? null;
};

// Fonction pour récupérer l'établissement depuis Supabase
export const fetchEstablishment = async (establishmentSlug: string): Promise<Establishment | null> => {
  const supabase = (await import("@/lib/supabase/client")).createClient();
  const { data: establishmentData, error: establishmentError } = await supabase
    .from("establishments")
    .select("*")
    .eq("slug", establishmentSlug)
    .eq("deleted", false)
    .single();

  if (establishmentError || !establishmentData) {
    console.error("❌ Erreur établissement:", establishmentError);
    return null;
  }

  return establishmentData;
};

// Fonction pour créer les données de réservation depuis le store
export const createBookingDataFromStore = (bookingConfirmation: any) => {
  return {
    id: bookingConfirmation.id,
    date: bookingConfirmation.date,
    time: bookingConfirmation.time,
    guests: bookingConfirmation.number_of_guests,
    customerName: `${bookingConfirmation.customer_first_name} ${bookingConfirmation.customer_last_name}`,
    email: bookingConfirmation.customer_email,
    phone: bookingConfirmation.customer_phone,
  };
};

// Fonction pour créer les données de réservation depuis les paramètres
export const createBookingDataFromParams = (
  booking: any,
  bookingDate: string | null,
  bookingTime: string | null,
  guests: string | null,
) => {
  return {
    id: booking.id,
    date: bookingDate ?? booking.date,
    time: bookingTime ?? booking.time,
    guests: guests ?? booking.number_of_guests,
    customerName: `${booking.customer_first_name} ${booking.customer_last_name}`,
    email: booking.customer_email,
    phone: booking.customer_phone,
  };
};

// Fonction pour récupérer les données de réservation depuis la base de données
export const fetchBookingFromDatabase = async (
  bookingId: string,
  bookingDate: string | null,
  bookingTime: string | null,
  guests: string | null,
) => {
  const supabase = (await import("@/lib/supabase/client")).createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return null;
  }

  return createBookingDataFromParams(booking, bookingDate, bookingTime, guests);
};
