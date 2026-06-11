"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type DbShift = Database["public"]["Tables"]["employee_shifts"]["Row"];
export type DbShiftTemplate = Database["public"]["Tables"]["employee_shift_templates"]["Row"];
export type DbShiftOverride = Database["public"]["Tables"]["employee_shift_overrides"]["Row"];

const QK_SHIFTS = "employee-shifts";
const QK_TEMPLATES = "employee-shift-templates";
const QK_OVERRIDES = "employee-shift-overrides";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEmployeeShifts(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QK_SHIFTS, establishmentId, organizationId],
    queryFn: async (): Promise<DbShift[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_shifts")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

export function useEmployeeShiftTemplates(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QK_TEMPLATES, establishmentId, organizationId],
    queryFn: async (): Promise<DbShiftTemplate[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_shift_templates")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("label", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateShift(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Database["public"]["Tables"]["employee_shifts"]["Insert"]) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employee_shifts").insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as DbShift;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
    },
  });
}

export function useUpdateShift(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Database["public"]["Tables"]["employee_shifts"]["Update"] & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employee_shifts").update(updates).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as DbShift;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
    },
  });
}

export function useDeleteShift(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_shifts").update({ deleted: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
    },
  });
}

// ─── Overrides (exceptions individuelles) ────────────────────────────────────

export function useShiftOverrides(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QK_OVERRIDES, establishmentId, organizationId],
    queryFn: async (): Promise<DbShiftOverride[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_shift_overrides")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

export function useCreateShiftOverride(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Database["public"]["Tables"]["employee_shift_overrides"]["Insert"]) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employee_shift_overrides").insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as DbShiftOverride;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_OVERRIDES, establishmentId, organizationId] });
      void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
    },
  });
}

export function useUpdateShiftOverride(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Database["public"]["Tables"]["employee_shift_overrides"]["Update"] & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_shift_overrides")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbShiftOverride;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_OVERRIDES, establishmentId, organizationId] });
    },
  });
}

export function useDeleteShiftOverride(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_shift_overrides").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_OVERRIDES, establishmentId, organizationId] });
      void queryClient.invalidateQueries({ queryKey: [QK_SHIFTS, establishmentId, organizationId] });
    },
  });
}

// ─── Mutations templates ───────────────────────────────────────────────────────

export function useCreateShiftTemplate(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Database["public"]["Tables"]["employee_shift_templates"]["Insert"]) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employee_shift_templates").insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as DbShiftTemplate;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_TEMPLATES, establishmentId, organizationId] });
    },
  });
}

export function useUpdateShiftTemplate(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Database["public"]["Tables"]["employee_shift_templates"]["Update"] & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_shift_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbShiftTemplate;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_TEMPLATES, establishmentId, organizationId] });
    },
  });
}

export function useDeleteShiftTemplate(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("employee_shift_templates").update({ deleted: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QK_TEMPLATES, establishmentId, organizationId] });
    },
  });
}
