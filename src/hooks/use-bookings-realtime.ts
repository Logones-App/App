import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Booking = Tables<"bookings">;

interface UseBookingsRealtimeProps {
  establishmentId?: string;
  organizationId?: string;
  date?: string;
  enabled?: boolean;
}

interface UseBookingsRealtimeReturn {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBookingsRealtime({
  establishmentId,
  organizationId,
  date,
  enabled = true,
}: UseBookingsRealtimeProps): UseBookingsRealtimeReturn {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from("bookings").select("*").eq("deleted", false).order("created_at", { ascending: false });

      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      if (date) {
        query = query.eq("date", date);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("❌ Erreur lors de la récupération des réservations:", fetchError);
        setError(fetchError.message);
        return;
      }

      setBookings(data || []);
    } catch (err) {
      console.error("💥 Erreur inattendue lors de la récupération des réservations:", err);
      setError("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Chargement initial
    fetchBookings();

    // Configuration du realtime
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: establishmentId ? `establishment_id=eq.${establishmentId}` : undefined,
        },
        (payload) => {
          console.log("🔄 Changement realtime bookings:", payload);

          if (payload.eventType === "INSERT") {
            const newBooking = payload.new as Booking;
            if (!newBooking.deleted) {
              setBookings((prev) => [newBooking, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedBooking = payload.new as Booking;
            setBookings((prev) => prev.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking)));
          } else if (payload.eventType === "DELETE") {
            const deletedBooking = payload.old as Booking;
            setBookings((prev) => prev.filter((booking) => booking.id !== deletedBooking.id));
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Statut subscription bookings:", status);
      });

    // Cleanup
    return () => {
      console.log("🧹 Nettoyage subscription bookings");
      supabase.removeChannel(channel);
    };
  }, [enabled, establishmentId, organizationId, date]);

  const refetch = () => {
    fetchBookings();
  };

  return {
    bookings,
    isLoading,
    error,
    refetch,
  };
}
