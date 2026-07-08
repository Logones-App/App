import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// ─── HACCP config (BIDIRECTIONAL) — CRUD establishment-scoped, soft-delete. ─────
// Le mobile suit ces tables en realtime ; côté SaaS on écrit direct + invalidation.

// Cadence partagée (enum 5 valeurs, CHECK en base) — pilote le tableau de bord des
// tâches côté mobile. Défauts : sondes = biquotidien, bains/checklists = quotidien.
export type HaccpFrequency = "biquotidien" | "quotidien" | "hebdomadaire" | "mensuel" | "ponctuel";

export const HACCP_FREQUENCY_OPTIONS: { value: HaccpFrequency; label: string }[] = [
  { value: "biquotidien", label: "Biquotidien (2×/jour)" },
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "ponctuel", label: "Ponctuel" },
];

export const haccpFrequencyLabel = (f: string): string =>
  HACCP_FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;

export type HaccpZone = Tables<"haccp_zones">;

const zonesKey = (establishmentId: string) => ["haccp-zones", establishmentId] as const;

export function useHaccpZones(establishmentId: string) {
  return useQuery({
    queryKey: zonesKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_zones")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useUpsertHaccpZone(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; sort_order?: number }) => {
      const supabase = createClient();
      const name = input.name.trim();
      if (!name) throw new Error("Le nom est requis.");
      if (input.id) {
        const { error } = await supabase
          .from("haccp_zones")
          .update({ name, sort_order: input.sort_order ?? 0, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("haccp_zones").insert({
          organization_id: organizationId,
          establishment_id: establishmentId,
          name,
          sort_order: input.sort_order ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Zone enregistrée.");
      void queryClient.invalidateQueries({ queryKey: zonesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useDeleteHaccpZone(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_zones")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zone supprimée.");
      void queryClient.invalidateQueries({ queryKey: zonesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

// ─── Équipements : sondes de température + bains de friture (2 tables) ──────────

export type HaccpProbe = Tables<"haccp_temperature_probes">;
export type HaccpOilBath = Tables<"haccp_oil_baths">;

const probesKey = (establishmentId: string) => ["haccp-probes", establishmentId] as const;
const oilBathsKey = (establishmentId: string) => ["haccp-oil-baths", establishmentId] as const;

export function useHaccpProbes(establishmentId: string) {
  return useQuery({
    queryKey: probesKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_temperature_probes")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useHaccpOilBaths(establishmentId: string) {
  return useQuery({
    queryKey: oilBathsKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_oil_baths")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useUpsertHaccpProbe(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      label: string;
      zone_id: string | null;
      min_c: number | null;
      max_c: number | null;
      frequency: HaccpFrequency;
    }) => {
      const supabase = createClient();
      const label = input.label.trim();
      if (!label) throw new Error("Le nom est requis.");
      const values = {
        label,
        zone_id: input.zone_id,
        min_c: input.min_c,
        max_c: input.max_c,
        frequency: input.frequency,
      };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_temperature_probes")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_temperature_probes")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Équipement enregistré.");
      void queryClient.invalidateQueries({ queryKey: probesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useUpsertHaccpOilBath(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; label: string; frequency: HaccpFrequency }) => {
      const supabase = createClient();
      const label = input.label.trim();
      if (!label) throw new Error("Le nom est requis.");
      const values = { label, frequency: input.frequency };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_oil_baths")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_oil_baths")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Équipement enregistré.");
      void queryClient.invalidateQueries({ queryKey: oilBathsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useDeleteHaccpProbe(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_temperature_probes")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Équipement supprimé.");
      void queryClient.invalidateQueries({ queryKey: probesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

export function useDeleteHaccpOilBath(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_oil_baths")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Équipement supprimé.");
      void queryClient.invalidateQueries({ queryKey: oilBathsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

// ─── Surfaces de nettoyage (haccp_cleaning_surfaces) ───────────────────────────

export type HaccpSurface = Tables<"haccp_cleaning_surfaces">;
export type CleaningFrequency = "quotidien" | "hebdomadaire" | "mensuel";

const surfacesKey = (establishmentId: string) => ["haccp-surfaces", establishmentId] as const;

export function useHaccpSurfaces(establishmentId: string) {
  return useQuery({
    queryKey: surfacesKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_cleaning_surfaces")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useUpsertHaccpSurface(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; label: string; zone_id: string | null; frequency: CleaningFrequency }) => {
      const supabase = createClient();
      const label = input.label.trim();
      if (!label) throw new Error("Le nom est requis.");
      const values = { label, zone_id: input.zone_id, frequency: input.frequency };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_cleaning_surfaces")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_cleaning_surfaces")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Surface enregistrée.");
      void queryClient.invalidateQueries({ queryKey: surfacesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useDeleteHaccpSurface(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_cleaning_surfaces")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Surface supprimée.");
      void queryClient.invalidateQueries({ queryKey: surfacesKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

// ─── Modèles de checklists (haccp_checklist_templates) ─────────────────────────

export type HaccpChecklistTemplate = Tables<"haccp_checklist_templates">;

const checklistsKey = (establishmentId: string) => ["haccp-checklists", establishmentId] as const;

export function useHaccpChecklists(establishmentId: string) {
  return useQuery({
    queryKey: checklistsKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_checklist_templates")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useUpsertHaccpChecklist(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      frequency: HaccpFrequency;
      frequency_label: string;
      items: string[];
    }) => {
      const supabase = createClient();
      const title = input.title.trim();
      if (!title) throw new Error("Le titre est requis.");
      const values = {
        title,
        frequency: input.frequency,
        frequency_label: input.frequency_label.trim() || null,
        items: input.items.map((i) => i.trim()).filter(Boolean),
      };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_checklist_templates")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_checklist_templates")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Checklist enregistrée.");
      void queryClient.invalidateQueries({ queryKey: checklistsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useDeleteHaccpChecklist(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_checklist_templates")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checklist supprimée.");
      void queryClient.invalidateQueries({ queryKey: checklistsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

// ─── Documents (haccp_documents) + upload bucket haccp-photos ──────────────────

export type HaccpDocument = Tables<"haccp_documents">;
export type DocType = "plan" | "procedure" | "registre";

const documentsKey = (establishmentId: string) => ["haccp-documents", establishmentId] as const;

export function useHaccpDocuments(establishmentId: string) {
  return useQuery({
    queryKey: documentsKey(establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("haccp_documents")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("doc_type", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useUpsertHaccpDocument(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      doc_type: DocType;
      version: string;
      /** Fichier à uploader dans le bucket (optionnel). */
      file?: File | null;
    }) => {
      const supabase = createClient();
      const title = input.title.trim();
      if (!title) throw new Error("Le titre est requis.");

      let url: string | undefined;
      if (input.file) {
        const ext = input.file.name.split(".").pop() ?? "bin";
        const path = `${establishmentId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("haccp-photos").upload(path, input.file);
        if (upErr) throw upErr;
        url = path;
      }

      const base = { title, doc_type: input.doc_type, version: input.version.trim() || null };
      if (input.id) {
        const { error } = await supabase
          .from("haccp_documents")
          .update({ ...base, ...(url ? { url } : {}), updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("establishment_id", establishmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_documents")
          .insert({ organization_id: organizationId, establishment_id: establishmentId, ...base, url: url ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Document enregistré.");
      void queryClient.invalidateQueries({ queryKey: documentsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });
}

export function useDeleteHaccpDocument(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("haccp_documents")
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("establishment_id", establishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé.");
      void queryClient.invalidateQueries({ queryKey: documentsKey(establishmentId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression."),
  });
}

/** URL signée temporaire pour ouvrir un document stocké dans le bucket privé. */
export async function getHaccpDocumentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("haccp-photos").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
