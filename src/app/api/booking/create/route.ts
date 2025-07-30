import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { emailService } from "@/lib/services/email-service";
import { createClient } from "@/lib/supabase/server";

import { validateBookingRequest, type BookingRequest } from "../_utils/validation";

// Fonction pour créer un client avec le service role (permissions complètes)
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clé service role
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

// Fonction pour créer une réservation
async function createBookingInDatabase(data: BookingRequest) {
  const supabase = createServiceClient(); // Utiliser le service role

  console.log("🔍 Recherche de l'établissement:", data.establishmentId);

  // Récupérer l'établissement pour obtenir l'organization_id
  const { data: establishment, error: establishmentError } = await supabase
    .from("establishments")
    .select("*")
    .eq("id", data.establishmentId)
    .eq("deleted", false)
    .single();

  if (establishmentError || !establishment) {
    console.error("❌ Erreur établissement:", establishmentError);
    throw new Error("Établissement non trouvé");
  }

  console.log("✅ Établissement trouvé:", establishment.name);

  // Créer la réservation
  console.log("📝 Insertion de la réservation avec les données:", {
    establishment_id: data.establishmentId,
    organization_id: establishment.organization_id,
    date: data.date,
    time: data.time,
    customer_first_name: data.customerFirstName,
    customer_last_name: data.customerLastName,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone,
    number_of_guests: data.numberOfGuests,
    special_requests: data.specialRequests,
  });

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

  console.log("✅ Réservation créée avec succès:", booking.id);

  return { booking, establishment };
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

    console.log("✅ Validation réussie, création de la réservation...");

    // Créer la réservation
    const { booking, establishment } = await createBookingInDatabase(body);

    console.log("✅ Réservation créée avec succès:", booking.id);

    // Générer le token de confirmation sécurisé
    const confirmationToken = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Mettre à jour la réservation avec le token
    const supabase = createServiceClient(); // Utiliser le service role
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        confirmation_token: confirmationToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("❌ Erreur lors de la mise à jour du token:", updateError);
      // On continue quand même, la réservation est créée
    }

    // Préparer les données pour l'email
    const customerName = `${body.customerFirstName} ${body.customerLastName}`;
    const emailData = {
      booking,
      establishment,
      customerName,
      customerEmail: body.customerEmail,
      reservationDate: body.date,
      reservationTime: body.time,
      numberOfGuests: body.numberOfGuests,
      specialRequests: body.specialRequests,
    };

    // Envoyer les emails en arrière-plan (non-bloquant)
    Promise.all([
      emailService.sendBookingConfirmationEmail(emailData),
      emailService.sendEstablishmentNotificationEmail(emailData),
    ])
      .then(([confirmationSent, notificationSent]) => {
        console.log("📧 Emails envoyés:", {
          confirmation: confirmationSent ? "✅" : "❌",
          notification: notificationSent ? "✅" : "❌",
        });
      })
      .catch((error) => {
        console.error("❌ Erreur lors de l'envoi des emails:", error);
      });

    return NextResponse.json(
      {
        success: true,
        message: "Réservation créée avec succès",
        bookingId: booking.id,
        confirmationToken, // Token pour la redirection sécurisée
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
