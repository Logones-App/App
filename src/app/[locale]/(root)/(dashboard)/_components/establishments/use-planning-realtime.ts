"use client";

import { useEffect, useRef } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

const QK_SHIFTS = "employee-shifts";
const QK_OVERRIDES = "employee-shift-overrides";

export function usePlanningRealtime(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const channelShifts = useRef<RealtimeChannel | null>(null);
  const channelOverrides = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!establishmentId || !organizationId) return;
    const supabase = createClient();

    channelShifts.current = supabase
      .channel(`planning_shifts_${establishmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_shifts", filter: `establishment_id=eq.${establishmentId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
        },
      )
      .subscribe();

    channelOverrides.current = supabase
      .channel(`planning_overrides_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_shift_overrides",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: [QK_OVERRIDES, establishmentId, organizationId] });
        },
      )
      .subscribe();

    return () => {
      if (channelShifts.current) {
        supabase.removeChannel(channelShifts.current);
        channelShifts.current = null;
      }
      if (channelOverrides.current) {
        supabase.removeChannel(channelOverrides.current);
        channelOverrides.current = null;
      }
    };
  }, [establishmentId, organizationId, queryClient]);
}
