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

export function useEstablishmentEmployees(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, "establishment", establishmentId, organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("lastname", { ascending: true });
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateEmployees(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  establishmentId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
  if (establishmentId) {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "establishment", establishmentId, organizationId] });
  }
}

export function useCreateEmployee(organizationId: string, establishmentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmployeeInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").insert(payload).select("*").single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => invalidateEmployees(queryClient, organizationId, establishmentId),
  });
}

export function useUpdateEmployee(organizationId: string, establishmentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: EmployeeUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => invalidateEmployees(queryClient, organizationId, establishmentId),
  });
}

export function useDeleteEmployee(organizationId: string, establishmentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employees").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateEmployees(queryClient, organizationId, establishmentId),
  });
}
