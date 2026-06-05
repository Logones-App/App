"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type EmployeeDocument = Database["public"]["Tables"]["employee_documents"]["Row"];
export type EmployeeDocumentInsert = Database["public"]["Tables"]["employee_documents"]["Insert"];

const QUERY_KEY = "employee-documents";

export function useEmployeeDocuments(organizationId: string, employeeId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId, employeeId],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("employee_documents")
        .select("*, employee:employees!employee_documents_employee_id_fkey(id, firstname, lastname)")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as (EmployeeDocument & { employee: { id: string; firstname: string; lastname: string } | null })[];
    },
    enabled: !!organizationId,
  });
}

export function useUploadEmployeeDocument(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: Omit<EmployeeDocumentInsert, "file_path"> }) => {
      const supabase = createClient();
      const path = `${organizationId}/${meta.employee_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("employee-documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data, error } = await supabase
        .from("employee_documents")
        .insert({ ...meta, file_path: path })
        .select("*")
        .single();
      if (error) throw error;
      return data as EmployeeDocument;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useDeleteEmployeeDocument(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_documents").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useDocumentSignedUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("employee-documents").createSignedUrl(filePath, 60); // 60 secondes
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
