import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    // Décoder le token
    const decodedToken = atob(token);
    const [bookingId, timestamp, establishmentId] = decodedToken.split(":");

    // Vérifier que le token n'est pas expiré (15 minutes)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 15 * 60 * 1000) {
      return NextResponse.json({ error: "Token expiré" }, { status: 401 });
    }

    // Vérifier que les données sont valides
    if (!bookingId || !establishmentId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 400 });
    }

    // Utiliser le service role pour contourner les RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clé service role
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        establishment_id,
        date,
        time,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        number_of_guests,
        special_requests,
        status,
        created_at
      `,
      )
      .eq("id", bookingId)
      .eq("establishment_id", establishmentId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Réservation non trouvée" }, { status: 404 });
    }

    // Retourner les données sécurisées
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        customerName: `${booking.customer_first_name} ${booking.customer_last_name}`,
        email: booking.customer_email,
        phone: booking.customer_phone,
        guests: booking.number_of_guests,
        specialRequests: booking.special_requests,
        status: booking.status,
        createdAt: booking.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du token:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
