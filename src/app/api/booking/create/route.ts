import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { emailService } from "@/lib/services/email-service";

import { validateBookingRequest, type BookingRequest } from "../_utils/validation";

function createServiceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createBookingInDatabase(data: BookingRequest) {
  const supabase = createServiceClient();

  const { data: establishment, error: establishmentError } = await supabase
    .from("establishments")
    .select("*")
    .eq("id", data.establishmentId)
    .eq("deleted", false)
    .single();

  if (establishmentError || !establishment) {
    throw new Error("Établissement non trouvé");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      establishment_id: data.establishmentId,
      organization_id: establishment.organization_id,
      date: data.date,
      time: data.time,
      service_name: "Service standard",
      customer_first_name: data.customerFirstName,
      customer_last_name: data.customerLastName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      number_of_guests: data.numberOfGuests,
      special_requests: data.specialRequests,
      status: "pending",
    })
    .select()
    .single();

  if (bookingError) {
    throw new Error("Erreur lors de la création de la réservation");
  }

  return { booking, establishment };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateBookingRequest(body);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Données invalides", details: validation.errors }, { status: 400 });
    }

    const { booking, establishment } = await createBookingInDatabase(body);

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

    Promise.all([
      emailService.sendBookingConfirmationEmail(emailData),
      emailService.sendEstablishmentNotificationEmail(emailData),
    ]).catch((error) => {
      console.error("Erreur envoi email:", error);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Réservation créée avec succès",
        bookingId: booking.id,
        bookingData: {
          id: booking.id,
          establishment_id: booking.establishment_id,
          date: booking.date,
          time: booking.time,
          service_name: booking.service_name,
          customer_first_name: booking.customer_first_name,
          customer_last_name: booking.customer_last_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          number_of_guests: booking.number_of_guests,
          special_requests: booking.special_requests,
          status: booking.status,
          created_at: booking.created_at,
          establishment: {
            id: establishment.id,
            name: establishment.name,
            slug: establishment.slug,
            address: establishment.address,
            phone: establishment.phone,
            email: establishment.email,
            description: establishment.description,
            image_url: establishment.image_url,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la réservation",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
