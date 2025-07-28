import { useEffect, useState } from "react";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface UseBookingExceptionsRealtimeProps {
  establishmentId: string;
  date?: Date;
}

interface UseBookingExceptionsRealtimeReturn {
  exceptions: BookingException[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook realtime optimisé pour les booking_exceptions
 * Suit le pattern modulaire de l'application
 */
export function useBookingExceptionsRealtime({
  establishmentId,
  date,
}: UseBookingExceptionsRealtimeProps): UseBookingExceptionsRealtimeReturn {
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  // Fonction pour récupérer les exceptions initiales
  const fetchExceptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("booking_exceptions")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("status", "active");

      // Si une date est spécifiée, filtrer par date
      if (date) {
        const dateStr = date.toISOString().split("T")[0];
        query = query.or(`date.eq.${dateStr},and(start_date.lte.${dateStr},end_date.gte.${dateStr})`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération des exceptions: ${fetchError.message}`);
      }

      // Filtrer les exceptions non supprimées
      const activeExceptions = (data ?? []).filter((exception: BookingException) => {
        return exception.deleted !== true;
      });
      setExceptions(activeExceptions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!establishmentId) {
      setExceptions([]);
      setIsLoading(false);
      return;
    }

    // Récupération initiale
    fetchExceptions();

    // Configuration du canal realtime
    const channel = supabase
      .channel("booking-exceptions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_exceptions",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<BookingException>) => {
          handleExceptionChange(payload);
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("🔄 Booking exceptions realtime: Subscribed");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Booking exceptions realtime: Channel error");
          setError(new Error("Erreur de connexion realtime"));
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishmentId, date, fetchExceptions, supabase]);

  // Fonction pour gérer les changements realtime
  const handleExceptionChange = (payload: RealtimePostgresChangesPayload<BookingException>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setExceptions((prevExceptions) => {
      switch (eventType) {
        case "INSERT":
          return [...prevExceptions, newRecord];

        case "UPDATE":
          return prevExceptions.map((exception) => (exception.id === newRecord.id ? newRecord : exception));

        case "DELETE":
          return prevExceptions.filter((exception) => exception.id !== oldRecord.id);

        default:
          return prevExceptions;
      }
    });
  };

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
