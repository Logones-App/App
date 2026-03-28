"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

import type { BookingSlot } from "./establishment-slots-types";

export function useBookingSlotsRealtime(establishmentId: string) {
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadBookingSlots = useCallback(async () => {
    try {
      const { data, error: qError } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (qError) {
        setError(qError.message);
        return;
      }
      setBookingSlots((data ?? []) as BookingSlot[]);
    } catch {
      setError("Erreur lors du chargement des créneaux");
    } finally {
      setLoading(false);
    }
  }, [supabase, establishmentId]);

  useEffect(() => {
    if (!establishmentId) return;
    void loadBookingSlots();
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
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT") {
            setBookingSlots((prev) => [...prev, payload.new as BookingSlot]);
          } else if (payload.eventType === "UPDATE") {
            setBookingSlots((prev) => prev.map((h) => (h.id === payload.new.id ? (payload.new as BookingSlot) : h)));
          } else if (payload.eventType === "DELETE") {
            setBookingSlots((prev) => prev.filter((h) => h.id === (payload.old as { id: string }).id));
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
        channelRef.current = null;
      }
    };
  }, [loadBookingSlots, supabase, establishmentId]);

  return { bookingSlots, loading, error, isConnected, setBookingSlots };
}
