"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { type Json } from "@/lib/supabase/database.types";

import { SAAS_RECEPTION_DOC_TYPE } from "./reception-delta";

export type DocStatus = "processing" | "auto_valide" | "a_valider" | "valide" | "erreur";
export type DocType = "facture" | "bl" | "facture_bl" | "ticket";

export type DocLigne = {
  reference?: string;
  designation?: string;
  quantite?: number;
  unite?: string;
  prix_unitaire?: number;
  total_ht?: number;
  contenance_unitaire?: number;
  unite_contenance?: string;
  _confidence?: "low";
  [key: string]: unknown;
};

export type TvaDetail = {
  base_ht: number;
  taux_tva: number;
  montant_tva: number;
};

export type DocJson = {
  type?: string;
  fournisseur?: string;
  adresse_fournisseur?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  numero_facture?: string;
  numero_bl?: string | string[];
  reference_commande?: string | string[];
  compte_client?: string;
  representant?: string;
  date?: string;
  date_echeance?: string | null;
  date_livraison?: string;
  lignes?: DocLigne[];
  total_ht?: number;
  tva_rate?: number;
  tva_montant?: number;
  tva_details?: TvaDetail[] | null;
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
      // Exclure les réceptions SaaS synthétiques (mode 'pos') de l'inbox OCR — sauf filtre explicite.
      // `or(is null …)` pour ne pas écarter les vrais docs OCR sans doc_type.
      else q = q.or(`doc_type.is.null,doc_type.neq.${SAAS_RECEPTION_DOC_TYPE}`);
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
      const json = validatedJson as DocJson;

      const docPatch = {
        status: "valide",
        validated_json: validatedJson,
        document_date: json.date ?? json.date_livraison ?? null,
        numero_document: (() => {
          const v = json.numero_facture ?? json.numero_bl ?? null;
          return Array.isArray(v) ? (v[0] ?? null) : typeof v === "string" ? v : null;
        })(),
        date_echeance: typeof json.date_echeance === "string" ? json.date_echeance : null,
        date_livraison: json.date_livraison ?? null,
        total_ht: typeof json.total_ht === "number" ? json.total_ht : null,
        total_ttc: typeof json.total_ttc === "number" ? json.total_ttc : null,
        tva_details: Array.isArray(json.tva_details) ? (json.tva_details as Json) : null,
      };

      const { error: docError } = await supabase.from("doc_imports").update(docPatch).eq("id", docId);
      if (docError) throw docError;

      const lignes = Array.isArray(json.lignes) ? json.lignes : [];
      if (lignes.length > 0) {
        const rows = lignes.map((l: DocLigne) => ({
          import_id: docId,
          reference: l.reference ?? null,
          designation: l.designation ?? null,
          quantite: l.quantite ?? null,
          unite: l.unite ?? null,
          prix_unitaire: l.prix_unitaire ?? null,
          total_ht: l.total_ht ?? null,
          contenance_unitaire: typeof l.contenance_unitaire === "number" ? l.contenance_unitaire : null,
          unite_contenance: l.unite_contenance ?? null,
          automation_status: "pending",
        }));
        const { error: linesError } = await supabase.from("doc_import_lines").insert(rows);
        if (linesError) throw linesError;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doc-import", docId] });
      void queryClient.invalidateQueries({ queryKey: ["doc-imports"] });
      void queryClient.invalidateQueries({ queryKey: ["doc-import-lines", docId] });
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
