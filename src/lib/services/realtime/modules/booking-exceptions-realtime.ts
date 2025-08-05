import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type BookingException = Database["public"]["Tables"]["booking_exceptions"]["Row"];

export type BookingExceptionEvent = {
  type: "INSERT" | "UPDATE" | "DELETE";
  exceptionId: string;
  establishmentId: string;
  organizationId: string;
  data: BookingException;
  oldData?: BookingException;
  timestamp: string;
};

class BookingExceptionsRealtime {
  private subscriptions: RealtimeChannel[] = [];

  private createEvent(
    payload: RealtimePostgresChangesPayload<BookingException>,
    establishmentId: string,
    organizationId: string,
  ): BookingExceptionEvent {
    return {
      type: this.getEventType(payload.eventType),
      exceptionId: (payload.new as BookingException)?.id ?? (payload.old as BookingException)?.id ?? "",
      establishmentId,
      organizationId,
      data: (payload.new as BookingException) ??
        (payload.old as BookingException) ?? {
          booking_slot_id: null,
          closed_slots: null,
          created_at: null,
          created_by: null,
          date: null,
          deleted: null,
          description: null,
          establishment_id: null,
          id: "",
          organization_id: null,
          reason: null,
          updated_at: null,
        },
      oldData: (payload.old as BookingException) ?? {
        booking_slot_id: null,
        closed_slots: null,
        created_at: null,
        created_by: null,
        date: null,
        deleted: null,
        description: null,
        establishment_id: null,
        id: "",
        organization_id: null,
        reason: null,
        updated_at: null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private handleEvent(event: BookingExceptionEvent, onEvent?: (event: BookingExceptionEvent) => void) {
    console.log("🔄 Booking exceptions realtime event received:", event);
    this.handleExceptionEvent(event);
    if (onEvent) {
      onEvent(event);
    }
  }

  subscribeToEstablishmentExceptions(
    establishmentId: string,
    organizationId: string,
    onEvent?: (event: BookingExceptionEvent) => void,
  ) {
    const supabase = createClient();

    const subscription = supabase
      .channel(`booking-exceptions-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_exceptions",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<BookingException>) => {
          if (payload.new && (payload.new as BookingException).organization_id !== organizationId) {
            return;
          }

          const event = this.createEvent(payload, establishmentId, organizationId);
          this.handleEvent(event, onEvent);
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter((sub) => sub !== subscription);
    };
  }

  subscribeToOrganizationExceptions(organizationId: string, onEvent?: (event: BookingExceptionEvent) => void) {
    const supabase = createClient();

    const subscription = supabase
      .channel(`booking-exceptions-org-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_exceptions",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<BookingException>) => {
          const event = this.createEvent(
            payload,
            (payload.new as BookingException)?.establishment_id ??
              (payload.old as BookingException)?.establishment_id ??
              "",
            organizationId,
          );
          this.handleEvent(event, onEvent);
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter((sub) => sub !== subscription);
    };
  }

  private getEventType(eventType: string): "INSERT" | "UPDATE" | "DELETE" {
    switch (eventType) {
      case "INSERT":
        return "INSERT";
      case "UPDATE":
        return "UPDATE";
      case "DELETE":
        return "DELETE";
      default:
        return "UPDATE";
    }
  }

  private handleExceptionEvent(event: BookingExceptionEvent) {
    const { type, data } = event;

    switch (type) {
      case "INSERT":
        toast.success(`Nouvelle exception créée: ${data.reason ?? "Sans raison"}`);
        break;
      case "UPDATE":
        toast.info(`Exception modifiée: ${data.reason ?? "Sans raison"}`);
        break;
      case "DELETE":
        toast.warning("Exception supprimée");
        break;
    }
  }

  cleanup() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }
}

export const bookingExceptionsRealtime = new BookingExceptionsRealtime();
