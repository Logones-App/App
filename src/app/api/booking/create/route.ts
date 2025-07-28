import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { validateBookingRequest, type BookingRequest } from "../_utils/validation";

// Fonction pour créer une réservation
async function createBookingInDatabase(data: BookingRequest) {
  const supabase = await createClient();

  // Récupérer l'établissement pour obtenir l'organization_id
  const { data: establishment, error: establishmentError } = await supabase
    .from("establishments")
    .select("organization_id")
    .eq("id", data.establishmentId)
    .eq("deleted", false)
    .single();

  if (establishmentError || !establishment) {
    throw new Error("Établissement non trouvé");
  }

  // Créer la réservation
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      establishment_id: data.establishmentId,
      organization_id: establishment.organization_id,
      date: data.date,
      time: data.time,
      service_name: "Service standard", // Par défaut, peut être amélioré
      customer_first_name: data.customerFirstName,
      customer_last_name: data.customerLastName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      number_of_guests: data.numberOfGuests,
      special_requests: data.specialRequests,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError) {
    console.error("❌ Erreur lors de la création de la réservation:", bookingError);
    throw new Error("Erreur lors de la création de la réservation");
  }

  return booking;
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Création d'une nouvelle réservation");

    // Parser le body de la requête
    const body = await request.json();
    console.log("📝 Données reçues:", body);

    // Valider les données
    const validation = validateBookingRequest(body);
    if (!validation.isValid) {
      console.error("❌ Validation échouée:", validation.errors);
      return NextResponse.json({ error: "Données invalides", details: validation.errors }, { status: 400 });
    }

    // Créer la réservation
    const booking = await createBookingInDatabase(body);

    console.log("✅ Réservation créée avec succès:", booking.id);

    return NextResponse.json(
      {
        success: true,
        message: "Réservation créée avec succès",
        booking,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("💥 Erreur lors de la création de la réservation:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la réservation",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
