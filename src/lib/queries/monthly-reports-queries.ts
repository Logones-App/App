"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type MonthlyReport = Database["public"]["Tables"]["employee_monthly_reports"]["Row"];
export type MonthlyReportInsert = Database["public"]["Tables"]["employee_monthly_reports"]["Insert"];
export type MonthlyReportUpdate = Database["public"]["Tables"]["employee_monthly_reports"]["Update"];

const QUERY_KEY = "employee-monthly-reports";

export function useMonthlyReports(organizationId: string, year: number, month: number) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId, year, month],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_monthly_reports")
        .select("*, employee:employees!employee_monthly_reports_employee_id_fkey(id, firstname, lastname)")
        .eq("organization_id", organizationId)
        .eq("year", year)
        .eq("month", month)
        .eq("deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as (MonthlyReport & { employee: { id: string; firstname: string; lastname: string } | null })[];
    },
    enabled: !!organizationId,
  });
}

export function useUpsertMonthlyReport(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MonthlyReportInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_monthly_reports")
        .upsert(payload, { onConflict: "employee_id,year,month" })
        .select("*")
        .single();
      if (error) throw error;
      return data as MonthlyReport;
    },
    onSuccess: (_d, payload) => {
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, organizationId, payload.year, payload.month],
      });
    },
  });
}

export function useDeleteMonthlyReport(organizationId: string, year: number, month: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_monthly_reports").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId, year, month] });
    },
  });
}
