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
  private subscriptions: any[] = [];

  private createEvent(payload: any, establishmentId: string, organizationId: string): BookingExceptionEvent {
    return {
      type: this.getEventType(payload.eventType),
      exceptionId: payload.new?.id ?? payload.old?.id ?? "",
      establishmentId,
      organizationId,
      data: payload.new ?? payload.old ?? ({} as BookingException),
      oldData: payload.old,
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
        (payload: any) => {
          if (payload.new && payload.new.organization_id !== organizationId) {
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
        (payload: any) => {
          const event = this.createEvent(
            payload,
            payload.new?.establishment_id ?? payload.old?.establishment_id ?? "",
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
