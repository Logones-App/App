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

// ─── Autres registres (même patron : LECTURE seule, récents d'abord) ───────────

export type HaccpOilTest = Tables<"haccp_oil_tests">;
export type HaccpReception = Tables<"haccp_receptions">;
export type HaccpCleaningValidation = Tables<"haccp_cleaning_validations">;
export type HaccpProductTempControl = Tables<"haccp_product_temp_controls">;
export type HaccpTraceDetailed = Tables<"haccp_trace_detailed">;
export type HaccpTraceSimple = Tables<"haccp_trace_simple">;
export type HaccpLabel = Tables<"haccp_labels">;
export type HaccpChecklistRun = Tables<"haccp_checklist_runs">;

export function useHaccpOilTests(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-oil-tests", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_oil_tests")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("tested_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpReceptions(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-receptions", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_receptions")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("received_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpCleaningValidations(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-cleaning-validations", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_cleaning_validations")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("validated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpProductTempControls(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-product-temp-controls", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_product_temp_controls")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("measured_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpTraceDetailed(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-trace-detailed", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_trace_detailed")
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

export function useHaccpTraceSimple(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-trace-simple", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_trace_simple")
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

export function useHaccpLabels(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-labels", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_labels")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("produced_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpChecklistRuns(establishmentId: string, limit = 500) {
  return useQuery({
    queryKey: ["haccp-checklist-runs", establishmentId, limit] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_checklist_runs")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("run_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

// ─── Helpers partagés (date/heure) ─────────────────────────────────────────────

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
