"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { isCertifyingPermission, presetForRole } from "@/lib/permissions/employee-permissions";
import { writeJet130Server } from "@/lib/permissions/nf525-jet";
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

// Seed des droits par défaut selon le rôle (modèle default-DENY : sans ligne, l'employé
// serait verrouillé). Best-effort : un échec ici ne doit pas annuler la création.
async function seedRolePermissions(supabase: ReturnType<typeof createClient>, employee: Employee) {
  const keys = presetForRole(employee.role);
  if (keys.length === 0 || !employee.establishment_id || !employee.organization_id) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rows = keys.map((permission) => ({
    employee_id: employee.id,
    establishment_id: employee.establishment_id,
    organization_id: employee.organization_id,
    permission,
    granted_by: user?.id ?? null,
  }));
  const { error } = await supabase.from("employee_permissions").insert(rows);
  if (error) throw new Error(error.message);
  // JET 130 : octroi des droits initiaux certifiants (best-effort, ne bloque pas la création).
  const certifying = keys.filter(isCertifyingPermission);
  if (certifying.length === 0) return;
  const actor = user?.email ?? user?.id ?? "système";
  const label = `${employee.lastname} ${employee.firstname} : droits initiaux preset ${employee.role} [${certifying
    .map((k) => `+${k}`)
    .join(", ")}] (par ${actor})`;
  await writeJet130Server({
    establishmentId: employee.establishment_id,
    organizationId: employee.organization_id,
    label,
  });
}

export function useCreateEmployee(organizationId: string, establishmentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmployeeInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("employees").insert(payload).select("*").single();
      if (error) throw error;
      const employee = data as Employee;
      await seedRolePermissions(supabase, employee);
      return employee;
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
