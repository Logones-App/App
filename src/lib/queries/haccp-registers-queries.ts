"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// ─── HACCP registres/journaux (LECTURE seule — saisis sur mobile) ──────────────
// Vues « inspecteur » côté SaaS. Aucune écriture ici (registres push-only mobile).

export type HaccpTemperatureReading = Tables<"haccp_temperature_readings">;

/** Relevés de température (les plus récents d'abord, plafonnés). */
export function useHaccpTemperatureReadings(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-temperature-readings", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_temperature_readings")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

// ─── Helpers conformité / affichage température ────────────────────────────────

export type TempStatus = "ok" | "alerte";

export function temperatureStatus(value: number, min: number | null, max: number | null): TempStatus {
  if (min != null && value < min) return "alerte";
  if (max != null && value > max) return "alerte";
  return "ok";
}

export function formatTemperatureTarget(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} – ${max} °C`;
  if (min != null) return `≥ ${min} °C`;
  if (max != null) return `≤ ${max} °C`;
  return "—";
}
