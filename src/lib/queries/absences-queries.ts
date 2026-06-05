"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Absence = Database["public"]["Tables"]["employee_absences"]["Row"];
export type AbsenceInsert = Database["public"]["Tables"]["employee_absences"]["Insert"];
export type AbsenceUpdate = Database["public"]["Tables"]["employee_absences"]["Update"];

const QUERY_KEY = "employee-absences";

export function useAbsences(organizationId: string, filters?: { employeeId?: string; year?: number }) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId, filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("employee_absences")
        .select("*, employee:employees!employee_absences_employee_id_fkey(id, firstname, lastname)")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("start_date", { ascending: false });

      if (filters?.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters?.year) {
        q = q.gte("start_date", `${filters.year}-01-01`).lte("start_date", `${filters.year}-12-31`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as (Absence & { employee: { id: string; firstname: string; lastname: string } | null })[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateAbsence(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AbsenceInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employee_absences").insert(payload).select("*").single();
      if (error) throw error;
      return data as Absence;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useUpdateAbsence(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: AbsenceUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_absences")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Absence;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useDeleteAbsence(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_absences").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}
