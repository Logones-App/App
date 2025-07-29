import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

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
  const fetchExceptions = async (): Promise<BookingException[]> => {
    if (!establishmentId) {
      setExceptions([]);
      setIsLoading(false);
      setError(null);
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      // Utiliser TanStack Query pour la récupération initiale
      const data = await queryClient.fetchQuery({
        queryKey: ["booking-exceptions", establishmentId],
        queryFn: async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();

          // Récupérer TOUTES les exceptions de l'établissement sans filtrage par date
          // Le filtrage se fera côté client dans useBookingExceptionsForDate ou groupSlotsByServiceRealtime
          const { data, error } = await supabase
            .from("booking_exceptions")
            .select("*")
            .eq("establishment_id", establishmentId)
            .eq("status", "active")
            .eq("deleted", false);

          if (error) throw error;
          return data ?? [];
        },
      });

      setExceptions(data ?? []);
      return data ?? [];
    } catch (err) {
      console.error("❌ Erreur dans useBookingExceptionsRealtime:", err);
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial des exceptions
  const { data: initialExceptions, error: fetchError } = useQuery({
    queryKey: ["booking-exceptions", establishmentId, organizationId],
    queryFn: fetchExceptions,
    enabled: !!establishmentId, // organizationId n'est pas nécessaire pour récupérer les exceptions
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log("🔍 DEBUG useBookingExceptionsRealtime:");
  console.log("  - establishmentId:", establishmentId);
  console.log("  - organizationId:", organizationId);
  console.log("  - initialExceptions:", initialExceptions?.length || 0);
  console.log("  - fetchError:", fetchError);

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
export function useBookingExceptionsForDate(establishmentId: string, date: Date, organizationId?: string) {
  const { exceptions, isLoading, error } = useBookingExceptionsRealtime({
    establishmentId,
    organizationId,
    date,
  });

  // Filtrer les exceptions qui s'appliquent spécifiquement à cette date
  const adjustedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateStr = adjustedDate.toISOString().split("T")[0];
  
  const dateExceptions = exceptions.filter((exception) => {
    console.log("🔍 DEBUG useBookingExceptionsForDate:");
    console.log("  - Date reçue:", date);
    console.log("  - Date ajustée:", adjustedDate);
    console.log("  - dateStr formatée:", dateStr);
    console.log("  - Exception:", exception.exception_type, exception.date, exception.start_date, exception.end_date);
    console.log("  - Exception ID:", exception.id);
    console.log("  - Exception date en base:", exception.date);
    console.log("  - Exception start_date en base:", exception.start_date);
    console.log("  - Exception end_date en base:", exception.end_date);

    switch (exception.exception_type) {
      case "period": {
        const periodMatch = !!(
          exception.start_date &&
          exception.end_date &&
          dateStr >= exception.start_date &&
          dateStr <= exception.end_date
        );
        console.log("  - Period match:", periodMatch);
        console.log("  - Comparaison:", dateStr, ">=", exception.start_date, "&&", dateStr, "<=", exception.end_date);
        return periodMatch;
      }

      case "single_day": {
        const singleDayMatch = exception.date === dateStr;
        console.log("  - Single day match:", singleDayMatch);
        console.log("  - Comparaison:", exception.date, "===", dateStr);
        return singleDayMatch;
      }

      case "service":
        // Les exceptions de service s'appliquent à toutes les dates
        console.log("  - Service exception: true");
        return true;

      case "time_slots": {
        // Les exceptions de créneaux horaires s'appliquent à toutes les dates
        console.log("  - Time slots exception: true");
        return true;
      }

      default:
        console.log("  - Unknown exception type: false");
        return false;
    }
  });

  console.log("🔍 DEBUG useBookingExceptionsForDate - Résultat:");
  console.log("  - Exceptions totales:", exceptions.length);
  console.log("  - Exceptions filtrées:", dateExceptions.length);
  console.log("  - DateStr utilisée pour le filtrage:", dateStr);

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
