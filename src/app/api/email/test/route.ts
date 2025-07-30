import { NextRequest, NextResponse } from "next/server";

import { emailService } from "@/lib/services/email-service";

function createTestData(data: any) {
  const testBooking = {
    id: data.bookingId ?? "test-booking-id",
    organization_id: "test-org-id",
    establishment_id: "test-establishment-id",
    customer_first_name: data.customerName?.split(" ")[0] ?? "John",
    customer_last_name: data.customerName?.split(" ")[1] ?? "Doe",
    customer_email: data.customerEmail,
    customer_phone: "+33123456789",
    date: data.reservationDate,
    time: data.reservationTime,
    number_of_guests: data.numberOfGuests,
    special_requests: data.specialRequests,
    service_name: "Dîner",
    status: "confirmed",
    deleted: false,
    created_at: new Date().toISOString(),
    created_by: "test-user-id",
    updated_at: new Date().toISOString(),
  };

  const testEstablishment = {
    id: "test-establishment-id",
    name: data.establishmentName,
    email: data.establishmentEmail,
    address: data.establishmentAddress,
    phone: data.establishmentPhone,
    organization_id: "test-org-id",
    cover_image_url: null,
    created_at: new Date().toISOString(),
    created_by: "test-user-id",
    deleted: false,
    description: null,
    slug: "test-establishment",
    updated_at: new Date().toISOString(),
    website: null,
    is_public: true,
    logo_url: null,
    seo_description: null,
    seo_title: null,
  };

  return {
    booking: testBooking,
    establishment: testEstablishment,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    reservationDate: data.reservationDate,
    reservationTime: data.reservationTime,
    numberOfGuests: data.numberOfGuests,
    specialRequests: data.specialRequests,
  };
}

async function sendTestEmail(type: string, bookingData: any) {
  switch (type) {
    case "confirmation":
      return await emailService.sendBookingConfirmationEmail(bookingData);
    case "notification":
      return await emailService.sendEstablishmentNotificationEmail(bookingData);
    case "reminder":
      return await emailService.sendBookingReminderEmail(bookingData);
    default:
      throw new Error("Type d'email non reconnu");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ success: false, error: "Type et données requis" }, { status: 400 });
    }

    const bookingData = createTestData(data);
    const success = await sendTestEmail(type, bookingData);
    const message = success ? "Email envoyé avec succès" : "Échec de l'envoi de l'email";

    return NextResponse.json({
      success,
      message,
      type,
      data: bookingData,
    });
  } catch (error) {
    console.error("❌ Erreur lors du test d'email:", error);
    return NextResponse.json({ success: false, error: "Erreur lors du test d'email" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API de test d'emails disponible",
    endpoints: {
      confirmation: "POST /api/email/test avec type: 'confirmation'",
      notification: "POST /api/email/test avec type: 'notification'",
      reminder: "POST /api/email/test avec type: 'reminder'",
    },
  });
}
