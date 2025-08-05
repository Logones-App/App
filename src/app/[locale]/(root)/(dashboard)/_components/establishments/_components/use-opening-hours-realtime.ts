"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Type pour les horaires d'ouverture
export interface OpeningHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  establishment_id: string;
  organization_id: string;
  name: string | null;
  created_by: string | null;
}

// Hook realtime pour opening_hours d'un établissement
export function useOpeningHoursRealtime(establishmentId: string) {
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  // Permet d'exposer le setter pour l'optimistic update
  const setOpeningHoursRef = useRef(setOpeningHours);
  setOpeningHoursRef.current = setOpeningHours;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Chargement initial
  const loadOpeningHours = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("opening_hours")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("open_time", { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setOpeningHours(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des horaires");
    } finally {
      setLoading(false);
    }
  }, [supabase, establishmentId]);

  // Abonnement realtime
  useEffect(() => {
    if (!establishmentId) return;
    loadOpeningHours();
    const channel = supabase
      .channel(`opening_hours_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opening_hours",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<OpeningHour>) => {
          if (payload.eventType === "INSERT") {
            setOpeningHours((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setOpeningHours((prev) => prev.map((h) => (h.id === payload.new.id ? payload.new : h)));
          } else if (payload.eventType === "DELETE") {
            setOpeningHours((prev) => prev.filter((h) => h.id !== payload.old.id));
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
  }, [loadOpeningHours, supabase, establishmentId]);

  return { openingHours, loading, error, isConnected, setOpeningHours };
} 