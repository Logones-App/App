"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
export type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

const QUERY_KEY = "employees";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEmployees(organizationId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("lastname", { ascending: true });
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!organizationId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateEmployee(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmployeeInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").insert(payload).select("*").single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useUpdateEmployee(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: EmployeeUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}

export function useDeleteEmployee(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employees").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}
