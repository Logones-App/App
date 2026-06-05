"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type EmployeeModuleAccess = Database["public"]["Tables"]["employee_module_access"]["Row"];
type EmployeePermission = Database["public"]["Tables"]["employee_permissions"]["Row"];

// ─── Module Access ─────────────────────────────────────────────────────────────

export function useEmployeeModuleAccess(employeeId: string, establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: ["employee-module-access", employeeId, establishmentId, organizationId],
    queryFn: async (): Promise<EmployeeModuleAccess[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_module_access")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!employeeId && !!establishmentId && !!organizationId,
  });
}

export function useToggleModuleAccess(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, module, grant }: { employeeId: string; module: string; grant: boolean }) => {
      const supabase = createClient();
      if (grant) {
        const { data: existing } = await supabase
          .from("employee_module_access")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("establishment_id", establishmentId)
          .eq("organization_id", organizationId)
          .eq("module", module)
          .limit(1)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("employee_module_access")
            .update({ deleted: false })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("employee_module_access").insert({
            employee_id: employeeId,
            establishment_id: establishmentId,
            organization_id: organizationId,
            module,
          });
          if (error) throw new Error(error.message);
        }
      } else {
        const { error } = await supabase
          .from("employee_module_access")
          .update({ deleted: true })
          .eq("employee_id", employeeId)
          .eq("establishment_id", establishmentId)
          .eq("organization_id", organizationId)
          .eq("module", module);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, { employeeId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["employee-module-access", employeeId, establishmentId, organizationId],
      });
    },
  });
}

// ─── Permissions ───────────────────────────────────────────────────────────────

export function useEmployeePermissionsAccess(employeeId: string, establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: ["employee-permissions-access", employeeId, establishmentId, organizationId],
    queryFn: async (): Promise<EmployeePermission[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employee_permissions")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!employeeId && !!establishmentId && !!organizationId,
  });
}

export function useTogglePermission(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      permission,
      grant,
    }: {
      employeeId: string;
      permission: string;
      grant: boolean;
    }) => {
      const supabase = createClient();
      if (grant) {
        const { data: existing } = await supabase
          .from("employee_permissions")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("establishment_id", establishmentId)
          .eq("organization_id", organizationId)
          .eq("permission", permission)
          .limit(1)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("employee_permissions")
            .update({ deleted: false })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("employee_permissions").insert({
            employee_id: employeeId,
            establishment_id: establishmentId,
            organization_id: organizationId,
            permission,
          });
          if (error) throw new Error(error.message);
        }
      } else {
        const { error } = await supabase
          .from("employee_permissions")
          .update({ deleted: true })
          .eq("employee_id", employeeId)
          .eq("establishment_id", establishmentId)
          .eq("organization_id", organizationId)
          .eq("permission", permission);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, { employeeId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["employee-permissions-access", employeeId, establishmentId, organizationId],
      });
    },
  });
}
