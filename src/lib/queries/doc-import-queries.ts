"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { type Json } from "@/lib/supabase/database.types";

export type DocStatus = "processing" | "auto_valide" | "a_valider" | "valide" | "erreur";
export type DocType = "facture" | "bl" | "ticket";

export type DocLigne = {
  reference?: string;
  designation?: string;
  quantite?: number;
  unite?: string;
  prix_unitaire?: number;
  total_ht?: number;
  _confidence?: "low";
  [key: string]: unknown;
};

export type DocJson = {
  type?: string;
  fournisseur?: string;
  adresse_fournisseur?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  numero_facture?: string;
  numero_bl?: string;
  reference_commande?: string;
  compte_client?: string;
  representant?: string;
  date?: string;
  date_echeance?: string;
  date_livraison?: string;
  lignes?: DocLigne[];
  total_ht?: number;
  tva_rate?: number;
  tva_montant?: number;
  total_ttc?: number;
  _confidence_total_ht?: "low";
  _date_confidence?: "low";
  [key: string]: unknown;
};

const PAGE_SIZE = 20;

export function useDocImports(
  organizationId?: string,
  establishmentId?: string,
  filters?: { status?: string; doc_type?: string; page?: number },
) {
  const page = filters?.page ?? 1;
  return useQuery({
    queryKey: ["doc-imports", organizationId, establishmentId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };
      const supabase = createClient();
      let q = supabase
        .from("doc_imports")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (establishmentId) q = q.eq("establishment_id", establishmentId);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.doc_type) q = q.eq("doc_type", filters.doc_type);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!organizationId,
  });
}

export function useDocImport(id?: string) {
  return useQuery({
    queryKey: ["doc-import", id],
    queryFn: async () => {
      if (!id) return null;
      const supabase = createClient();
      const { data, error } = await supabase.from("doc_imports").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDocSignedUrl(sourceUrl?: string | null) {
  return useQuery({
    queryKey: ["doc-signed-url", sourceUrl],
    queryFn: async () => {
      if (!sourceUrl) return null;
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("document-imports").createSignedUrl(sourceUrl, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!sourceUrl,
    staleTime: 50 * 60 * 1000,
  });
}

export function useValidateDoc(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (validatedJson: Json) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("doc_imports")
        .update({ status: "valide", validated_json: validatedJson })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doc-import", docId] });
      void queryClient.invalidateQueries({ queryKey: ["doc-imports"] });
    },
  });
}

export function useRejectDoc(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("doc_imports")
        .update({ status: "erreur", validation_error: reason ?? null })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doc-import", docId] });
      void queryClient.invalidateQueries({ queryKey: ["doc-imports"] });
    },
  });
}
