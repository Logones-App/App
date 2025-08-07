"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

// Type pour les créneaux de réservation
export interface BookingSlot {
  id: string;
  day_of_week: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  establishment_id: string;
}

// Hook realtime pour booking_slots d'un établissement
export function useBookingSlotsRealtime(establishmentId: string) {
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  // Permet d'exposer le setter pour l'optimistic update
  const setBookingSlotsRef = useRef(setBookingSlots);
  setBookingSlotsRef.current = setBookingSlots;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Chargement initial
  const loadBookingSlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setBookingSlots(data || []);
    } catch {
      setError("Erreur lors du chargement des créneaux");
    } finally {
      setLoading(false);
    }
  }, [supabase, establishmentId]);

  // Abonnement realtime
  useEffect(() => {
    if (!establishmentId) return;
    loadBookingSlots();
    const channel = supabase
      .channel(`booking_slots_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_slots",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<BookingSlot>) => {
          if (payload.eventType === "INSERT") {
            setBookingSlots((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setBookingSlots((prev) => prev.map((h) => (h.id === payload.new.id ? payload.new : h)));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setBookingSlots((prev) => prev.filter((h) => h.id !== payload.old.id));
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [establishmentId, loadBookingSlots, supabase]);

  return {
    bookingSlots,
    setBookingSlots: setBookingSlotsRef.current,
    loading,
    error,
    isConnected,
  };
}
