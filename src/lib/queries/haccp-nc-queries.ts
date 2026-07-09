"use client";

import { useEffect, useRef } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// ─── HACCP non-conformités (pivot PMS, BIDIRECTIONAL + realtime) ───────────────
// Source de vérité SaaS (cycle de vie) ; le mobile crée aussi des NC (ex. réception).

export type HaccpNonConformity = Tables<"haccp_non_conformities">;
export type NcStatus = "ouvert" | "en_cours" | "cloture";
export type NcSeverity = "mineure" | "majeure" | "critique";

export const NC_CATEGORIES: { value: string; label: string }[] = [
  { value: "temperature", label: "Température" },
  { value: "reception", label: "Réception" },
  { value: "nettoyage", label: "Nettoyage" },
  { value: "huile", label: "Huile" },
  { value: "cuisson", label: "Cuisson" },
  { value: "tracabilite", label: "Traçabilité" },
  { value: "hygiene_personnel", label: "Hygiène du personnel" },
  { value: "nuisibles", label: "Nuisibles" },
  { value: "equipement", label: "Équipement" },
  { value: "autre", label: "Autre" },
];

export const NC_SEVERITIES: { value: NcSeverity; label: string }[] = [
  { value: "mineure", label: "Mineure" },
  { value: "majeure", label: "Majeure" },
  { value: "critique", label: "Critique" },
];

export const NC_STATUSES: { value: NcStatus; label: string }[] = [
  { value: "ouvert", label: "Ouvert" },
  { value: "en_cours", label: "En cours" },
  { value: "cloture", label: "Clôturé" },
];

export const ncCategoryLabel = (v: string) => NC_CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const ncSeverityLabel = (v: string) => NC_SEVERITIES.find((s) => s.value === v)?.label ?? v;
export const ncStatusLabel = (v: string) => NC_STATUSES.find((s) => s.value === v)?.label ?? v;

const ncKey = (establishmentId: string) => ["haccp-nc", establishmentId] as const;

export function useHaccpNonConformities(establishmentId: string) {
  return useQuery({
    queryKey: ncKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_non_conformities")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export type NcInput = {
  id?: string;
  category: string;
  title: string | null;
  description: string;
  severity: NcSeverity;
  status: NcStatus;
  zone_id: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  assigned_to_label: string | null;
  due_at: string | null;
  reference: string | null;
};

export function useUpsertHaccpNc(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NcInput) => {
      const supabase = createClient();
      const description = input.description.trim();
      if (!description) throw new Error("La description est requise.");
      // Clôture depuis le formulaire : horodate ; réouverture : efface la date.
      const closedPatch = input.status === "cloture" ? { closed_at: new Date().toISOString() } : { closed_at: null };
      const values = {
        category: input.category,
        title: input.title,
        description,
        severity: input.severity,
        status: input.status,
        zone_id: input.zone_id,
        corrective_action: input.corrective_action,
        preventive_action: input.preventive_action,
        assigned_to_label: input.assigned_to_label,
        due_at: input.due_at,
        reference: input.reference,
        ...closedPatch,
      };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_non_conformities")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_non_conformities")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Non-conformité enregistrée.");
      void queryClient.invalidateQueries({ queryKey: ncKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useCloseHaccpNc(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_non_conformities")
        .update({ status: "cloture", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Non-conformité clôturée.");
      void queryClient.invalidateQueries({ queryKey: ncKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la clôture."),
  });
}

export function useDeleteHaccpNc(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_non_conformities")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Non-conformité supprimée.");
      void queryClient.invalidateQueries({ queryKey: ncKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

/** Souscription realtime → invalide la liste dès qu'une NC change (SaaS ou mobile). */
export function useHaccpNcRealtime(establishmentId: string) {
  const queryClient = useQueryClient();
  const channel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!establishmentId) return;
    const supabase = createClient();
    channel.current = supabase
      .channel(`haccp_nc_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "haccp_non_conformities",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ncKey(establishmentId) });
        },
      )
      .subscribe();

    return () => {
      if (channel.current) {
        supabase.removeChannel(channel.current);
        channel.current = null;
      }
    };
  }, [establishmentId, queryClient]);
}
