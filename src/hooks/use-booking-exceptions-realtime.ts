import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { bookingExceptionsRealtime, type BookingExceptionEvent } from "@/lib/services/realtime/modules";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface UseBookingExceptionsRealtimeProps {
  establishmentId?: string;
  organizationId?: string;
  date?: Date;
}

interface UseBookingExceptionsRealtimeReturn {
  exceptions: BookingException[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook realtime modulaire pour les booking_exceptions
 * Suit le pattern modulaire de l'application
 */
export function useBookingExceptionsRealtime({
  establishmentId,
  organizationId,
  date,
}: UseBookingExceptionsRealtimeProps): UseBookingExceptionsRealtimeReturn {
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // Fonction pour récupérer les exceptions initiales
  const fetchExceptions = async () => {
    if (!establishmentId) {
      setExceptions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Utiliser TanStack Query pour la récupération initiale
      const data = await queryClient.fetchQuery({
        queryKey: ["booking-exceptions", establishmentId, date?.toISOString().split("T")[0]],
        queryFn: async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();

          let query = supabase
            .from("booking_exceptions")
            .select("*")
            .eq("establishment_id", establishmentId)
            .eq("status", "active")
            .eq("deleted", false);

          // Si une date est spécifiée, filtrer par date
          if (date) {
            const dateStr = date.toISOString().split("T")[0];
            query = query.or(`date.eq.${dateStr},and(start_date.lte.${dateStr},end_date.gte.${dateStr})`);
          }

          const { data, error } = await query;
          if (error) throw error;
          return data ?? [];
        },
      });

      setExceptions(data ?? []);
    } catch (err) {
      console.error("❌ Erreur dans useBookingExceptionsRealtime:", err);
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Pattern standard de l'application : condition complète sans cleanup
    if (!establishmentId || !organizationId) return;

    // Récupération initiale
    fetchExceptions();

    // Configuration du realtime modulaire
    const unsubscribe = bookingExceptionsRealtime.subscribeToEstablishmentExceptions(
      establishmentId,
      organizationId,
      (event: BookingExceptionEvent) => {
        console.log("🔄 Booking exceptions realtime event received:", event);

        setExceptions((prevExceptions) => {
          switch (event.type) {
            case "INSERT":
              // Invalider le cache et rafraîchir
              queryClient.invalidateQueries({ queryKey: ["booking-exceptions", establishmentId] });
              return [...prevExceptions, event.data];

            case "UPDATE":
              // Invalider le cache et rafraîchir
              queryClient.invalidateQueries({ queryKey: ["booking-exceptions", establishmentId] });
              return prevExceptions.map((exception) => (exception.id === event.exceptionId ? event.data : exception));

            case "DELETE":
              // Invalider le cache et rafraîchir
              queryClient.invalidateQueries({ queryKey: ["booking-exceptions", establishmentId] });
              return prevExceptions.filter((exception) => exception.id !== event.exceptionId);

            default:
              return prevExceptions;
          }
        });
      },
    );

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [establishmentId, organizationId, date, queryClient]);

  // Fonction pour rafraîchir manuellement
  const refresh = () => {
    fetchExceptions();
  };

  return {
    exceptions,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook spécialisé pour les exceptions d'une date spécifique
 */
export function useBookingExceptionsForDate(establishmentId: string, date: Date) {
  const { exceptions, isLoading, error } = useBookingExceptionsRealtime({
    establishmentId,
    date,
  });

  // Filtrer les exceptions qui s'appliquent spécifiquement à cette date
  const dateExceptions = exceptions.filter((exception) => {
    const dateStr = date.toISOString().split("T")[0];

    switch (exception.exception_type) {
      case "period":
        return !!(
          exception.start_date &&
          exception.end_date &&
          dateStr >= exception.start_date &&
          dateStr <= exception.end_date
        );

      case "single_day":
        return exception.date === dateStr;

      case "service":
        // Pour les exceptions de service, valides pour tous les jours
        return true;

      case "time_slots":
        return exception.date === dateStr;

      default:
        return false;
    }
  });

  return {
    exceptions: dateExceptions,
    isLoading,
    error,
  };
}

/**
 * Hook pour vérifier si un créneau spécifique est fermé par une exception
 */
export function useSlotExceptionCheck(establishmentId: string, date: Date, time: string, bookingSlotId?: string) {
  const { exceptions } = useBookingExceptionsForDate(establishmentId, date);
  const [isClosed, setIsClosed] = useState(false);
  const [closingReason, setClosingReason] = useState<string | null>(null);

  useEffect(() => {
    if (!time || exceptions.length === 0) {
      setIsClosed(false);
      setClosingReason(null);
      return;
    }

    // Convertir l'heure en slot (format: "13:15" -> slot 53)
    const [hours, minutes] = time.split(":").map(Number);
    const slotNumber = hours * 4 + minutes / 15;

    // Vérifier chaque exception
    const closingException = exceptions.find((exception) => {
      switch (exception.exception_type) {
        case "period":
        case "single_day":
          return true; // Fermeture complète

        case "service":
          return exception.booking_slot_id === bookingSlotId;

        case "time_slots":
          return exception.booking_slot_id === bookingSlotId && (exception.closed_slots?.includes(slotNumber) ?? false);

        default:
          return false;
      }
    });

    if (closingException) {
      setIsClosed(true);
      setClosingReason(closingException.reason ?? null);
    } else {
      setIsClosed(false);
      setClosingReason(null);
    }
  }, [exceptions, time, bookingSlotId]);

  return {
    isClosed,
    closingReason,
  };
}
