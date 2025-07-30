import { NextRequest, NextResponse } from "next/server";

import { addDays, format } from "date-fns";

import { emailService } from "@/lib/services/email-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Envoi des rappels de réservation");

    const supabase = await createClient();

    // Calculer la date de demain
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDate = format(tomorrow, "yyyy-MM-dd");

    console.log("📅 Recherche des réservations pour:", tomorrowDate);

    // Récupérer toutes les réservations pour demain
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        establishments (
          id,
          name,
          email,
          address,
          phone
        )
      `,
      )
      .eq("date", tomorrowDate)
      .eq("status", "confirmed")
      .eq("deleted", false);

    if (bookingsError) {
      console.error("❌ Erreur lors de la récupération des réservations:", bookingsError);
      return NextResponse.json({ error: "Erreur lors de la récupération des réservations" }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log("ℹ️ Aucune réservation trouvée pour demain");
      return NextResponse.json({ message: "Aucune réservation trouvée pour demain", count: 0 }, { status: 200 });
    }

    console.log(`📧 Envoi de ${bookings.length} rappels`);

    // Envoyer les rappels
    const emailPromises = bookings.map(async (booking) => {
      const establishment = booking.establishments;

      if (!establishment) {
        console.log(`⚠️ Établissement non trouvé pour la réservation ${booking.id}`);
        return false;
      }

      const customerName = `${booking.customer_first_name} ${booking.customer_last_name}`;

      // Créer un objet establishment complet avec les propriétés manquantes
      const fullEstablishment = {
        id: establishment.id,
        name: establishment.name,
        email: establishment.email,
        address: establishment.address,
        phone: establishment.phone,
        // Propriétés manquantes avec des valeurs par défaut
        cover_image_url: null,
        created_at: null,
        created_by: null,
        deleted: false,
        description: null,
        organization_id: booking.organization_id,
        slug: null,
        updated_at: null,
        website: null,
        // Propriétés supplémentaires manquantes
        is_public: true,
        logo_url: null,
        seo_description: null,
        seo_title: null,
      };

      const emailData = {
        booking,
        establishment: fullEstablishment,
        customerName,
        customerEmail: booking.customer_email,
        reservationDate: booking.date,
        reservationTime: booking.time,
        numberOfGuests: booking.number_of_guests,
        specialRequests: booking.special_requests ?? undefined,
      };

      try {
        const sent = await emailService.sendBookingReminderEmail(emailData);
        console.log(`📧 Rappel ${booking.id}: ${sent ? "✅" : "❌"}`);
        return sent;
      } catch (error) {
        console.error(`❌ Erreur lors de l'envoi du rappel ${booking.id}:`, error);
        return false;
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(Boolean).length;

    console.log(`✅ Rappels envoyés: ${successCount}/${bookings.length}`);

    return NextResponse.json(
      {
        success: true,
        message: "Rappels envoyés avec succès",
        total: bookings.length,
        sent: successCount,
        failed: bookings.length - successCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Erreur lors de l'envoi des rappels:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi des rappels",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}

// GET pour tester l'API
export async function GET() {
  return NextResponse.json(
    {
      message: "API de rappels de réservation",
      usage: "POST pour envoyer les rappels automatiques",
    },
    { status: 200 },
  );
}
