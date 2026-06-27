"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type EmployeePermission = Database["public"]["Tables"]["employee_permissions"]["Row"];

function permissionsQueryKey(employeeId: string, establishmentId: string, organizationId: string) {
  return ["employee-permissions-access", employeeId, establishmentId, organizationId] as const;
}

// ─── Lecture des droits d'un employé ────────────────────────────────────────────

export function useEmployeePermissionsAccess(employeeId: string, establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: permissionsQueryKey(employeeId, establishmentId, organizationId),
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

// Accorde une clé : restaure une ligne soft-deleted ou en insère une nouvelle.
async function grantPermission(
  supabase: ReturnType<typeof createClient>,
  args: { employeeId: string; establishmentId: string; organizationId: string; permission: string },
) {
  const { employeeId, establishmentId, organizationId, permission } = args;
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
    const { error } = await supabase.from("employee_permissions").update({ deleted: false }).eq("id", existing.id);
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
}

// ─── Toggle d'un droit (case à cocher individuelle) ─────────────────────────────

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
        await grantPermission(supabase, { employeeId, establishmentId, organizationId, permission });
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
        queryKey: permissionsQueryKey(employeeId, establishmentId, organizationId),
      });
    },
  });
}

// ─── Applique un jeu de droits exact (preset de rôle) ───────────────────────────

export function useSetEmployeePermissions(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, keys }: { employeeId: string; keys: string[] }) => {
      const supabase = createClient();
      const target = new Set(keys);

      const { data: current, error } = await supabase
        .from("employee_permissions")
        .select("id, permission")
        .eq("employee_id", employeeId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);

      const currentKeys = new Set((current ?? []).map((r) => r.permission));
      const toRevoke = (current ?? []).filter((r) => !target.has(r.permission)).map((r) => r.id);
      const toGrant = keys.filter((k) => !currentKeys.has(k));

      if (toRevoke.length > 0) {
        const { error: revErr } = await supabase
          .from("employee_permissions")
          .update({ deleted: true })
          .in("id", toRevoke);
        if (revErr) throw new Error(revErr.message);
      }
      for (const permission of toGrant) {
        await grantPermission(supabase, { employeeId, establishmentId, organizationId, permission });
      }
    },
    onSuccess: (_, { employeeId }) => {
      void queryClient.invalidateQueries({
        queryKey: permissionsQueryKey(employeeId, establishmentId, organizationId),
      });
    },
  });
}
