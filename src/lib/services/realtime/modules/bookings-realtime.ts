import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

export interface BookingRealtimeEvent {
  type: "booking_created" | "booking_updated" | "booking_deleted";
  bookingId: string;
  establishmentId: string;
  organizationId: string;
  data: Record<string, unknown>;
  customerName?: string;
  timestamp: string;
}

class BookingsRealtime {
  private subscriptions: RealtimeChannel[] = [];

  /**
   * S'abonner aux changements des bookings d'un établissement
   */
  subscribeToEstablishmentBookings(
    establishmentId: string,
    organizationId: string,
    onEvent?: (event: BookingRealtimeEvent) => void,
  ) {
    console.log(`🔔 S'abonner aux changements des bookings pour l'établissement ${establishmentId}...`);

    const supabase = createClient();

    const subscription = supabase
      .channel(`bookings_establishment_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload: Record<string, unknown>) => {
          // Filtrer côté client pour cet établissement et organisation
          const record = payload.new ?? payload.old;
          if (
            record &&
            (record as Record<string, unknown>).establishment_id === establishmentId &&
            (record as Record<string, unknown>).organization_id === organizationId
          ) {
            const event: BookingRealtimeEvent = {
              type: this.getEventType(payload.eventType as string),
              bookingId: (record as Record<string, unknown>).id as string,
              establishmentId: (record as Record<string, unknown>).establishment_id as string,
              organizationId: (record as Record<string, unknown>).organization_id as string,
              data: (payload.new ?? payload.old) as Record<string, unknown>,
              customerName: this.getCustomerName((payload.new ?? payload.old) as Record<string, unknown>),
              timestamp: new Date().toISOString(),
            };

            console.log(
              "📡 Bookings realtime event:",
              event.type,
              (record as Record<string, unknown>).id,
              (record as Record<string, unknown>).establishment_id,
              (record as Record<string, unknown>).organization_id,
            );

            this.handleBookingEvent(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * S'abonner aux changements de tous les bookings d'une organisation
   */
  subscribeToOrganizationBookings(organizationId: string, onEvent?: (event: BookingRealtimeEvent) => void) {
    console.log(`🔔 S'abonner aux changements des bookings pour l'organisation ${organizationId}...`);

    const supabase = createClient();

    const subscription = supabase
      .channel(`bookings_organization_${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Filtrer côté client pour cette organisation
          const record = payload.new ?? payload.old;
          if (record && (record as Record<string, unknown>).organization_id === organizationId) {
            const event: BookingRealtimeEvent = {
              type: this.getEventType(payload.eventType),
              bookingId: (record as Record<string, unknown>).id as string,
              establishmentId: (record as Record<string, unknown>).establishment_id as string,
              organizationId: (record as Record<string, unknown>).organization_id as string,
              data: (payload.new ?? payload.old) as Record<string, unknown>,
              customerName: this.getCustomerName((payload.new ?? payload.old) as Record<string, unknown>),
              timestamp: new Date().toISOString(),
            };

            console.log(
              "📡 Bookings organization realtime event:",
              event.type,
              (record as Record<string, unknown>).id,
              (record as Record<string, unknown>).organization_id,
            );

            this.handleBookingEvent(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Envoyer une notification de booking
   */
  async sendBookingNotification(
    title: string,
    message: string,
    bookingId: string,
    establishmentId: string,
    organizationId: string,
    data?: Record<string, unknown>,
  ) {
    const supabase = createClient();
    const channel = supabase.channel("bookings_notifications");

    await channel.send({
      type: "broadcast",
      event: "booking_notifications",
      payload: {
        title,
        message,
        bookingId,
        establishmentId,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Envoyer une action de booking
   */
  async sendBookingAction(
    action: string,
    bookingId: string,
    establishmentId: string,
    organizationId: string,
    data?: Record<string, unknown>,
  ) {
    const supabase = createClient();
    const channel = supabase.channel("bookings_actions");

    await channel.send({
      type: "broadcast",
      event: "booking_actions",
      payload: {
        action,
        bookingId,
        establishmentId,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Gérer les événements de booking
   */
  private handleBookingEvent(event: BookingRealtimeEvent) {
    switch (event.type) {
      case "booking_created":
        toast.success("Nouvelle réservation ajoutée", {
          description: `Réservation pour ${event.customerName}`,
        });
        break;
      case "booking_updated":
        toast.info("Réservation mise à jour", {
          description: `Modification de la réservation pour ${event.customerName}`,
        });
        break;
      case "booking_deleted":
        toast.warning("Réservation supprimée", {
          description: `Suppression de la réservation pour ${event.customerName}`,
        });
        break;
    }
  }

  /**
   * Déterminer le type d'événement
   */
  private getEventType(eventType: string): BookingRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "booking_created";
      case "UPDATE":
        return "booking_updated";
      case "DELETE":
        return "booking_deleted";
      default:
        return "booking_updated";
    }
  }

  /**
   * Obtenir le nom du client
   */
  private getCustomerName(booking: Record<string, unknown>): string {
    if (!booking) return "Client inconnu";
    return `${booking.customer_first_name ?? ""} ${booking.customer_last_name ?? ""}`.trim() || "Client inconnu";
  }

  /**
   * Se désabonner de tous les abonnements
   */
  unsubscribe() {
    console.log("🔌 Désabonnement de tous les abonnements bookings...");
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }
}

// Instance singleton
export const bookingsRealtime = new BookingsRealtime();
