"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isCertifyingPermission } from "@/lib/permissions/employee-permissions";
import { writeJet130Server } from "@/lib/permissions/nf525-jet";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type EmployeePermission = Database["public"]["Tables"]["employee_permissions"]["Row"];
type SupabaseBrowserClient = ReturnType<typeof createClient>;

function permissionsQueryKey(employeeId: string, establishmentId: string, organizationId: string) {
  return ["employee-permissions-access", employeeId, establishmentId, organizationId] as const;
}

// Acteur courant (pour granted_by + libellé JET). email si dispo, sinon id.
async function currentActor(supabase: SupabaseBrowserClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { id: user?.id ?? null, label: user?.email ?? user?.id ?? "inconnu" };
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
  supabase: SupabaseBrowserClient,
  args: {
    employeeId: string;
    establishmentId: string;
    organizationId: string;
    permission: string;
    grantedBy: string | null;
  },
) {
  const { employeeId, establishmentId, organizationId, permission, grantedBy } = args;
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
      .update({ deleted: false, granted_by: grantedBy, granted_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("employee_permissions").insert({
      employee_id: employeeId,
      establishment_id: establishmentId,
      organization_id: organizationId,
      permission,
      granted_by: grantedBy,
    });
    if (error) throw new Error(error.message);
  }
}

// Notifie l'utilisateur si la journalisation NF525 a échoué (le droit, lui, est déjà modifié).
function notifyJetError(jetError: string | null) {
  if (jetError) toast.error(`Droit modifié mais journalisation NF525 (JET 130) échouée : ${jetError}`);
}

// ─── Toggle d'un droit (case à cocher individuelle) ─────────────────────────────

export function useTogglePermission(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      permission,
      grant,
      employeeLabel,
    }: {
      employeeId: string;
      permission: string;
      grant: boolean;
      employeeLabel?: string;
    }) => {
      const supabase = createClient();
      const actor = await currentActor(supabase);
      if (grant) {
        await grantPermission(supabase, {
          employeeId,
          establishmentId,
          organizationId,
          permission,
          grantedBy: actor.id,
        });
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
      // JET 130 seulement pour les droits certifiants (NF525).
      if (!isCertifyingPermission(permission)) return { jetError: null };
      const sign = grant ? "+" : "-";
      const label = `${employeeLabel ?? employeeId} : ${sign}${permission} (par ${actor.label})`;
      const jetError = await writeJet130Server({ establishmentId, organizationId, label });
      return { jetError };
    },
    onSuccess: ({ jetError }, { employeeId }) => {
      void queryClient.invalidateQueries({
        queryKey: permissionsQueryKey(employeeId, establishmentId, organizationId),
      });
      notifyJetError(jetError);
    },
  });
}

// ─── Applique un jeu de droits exact (preset de rôle) ───────────────────────────

export function useSetEmployeePermissions(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      keys,
      employeeLabel,
    }: {
      employeeId: string;
      keys: string[];
      employeeLabel?: string;
    }) => {
      const supabase = createClient();
      const actor = await currentActor(supabase);
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
      const revokedKeys = (current ?? []).filter((r) => !target.has(r.permission)).map((r) => r.permission);
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
        await grantPermission(supabase, {
          employeeId,
          establishmentId,
          organizationId,
          permission,
          grantedBy: actor.id,
        });
      }

      // JET 130 : ne journaliser que les changements sur des droits certifiants (NF525).
      const changes = [
        ...toGrant.filter(isCertifyingPermission).map((k) => `+${k}`),
        ...revokedKeys.filter(isCertifyingPermission).map((k) => `-${k}`),
      ];
      if (changes.length === 0) return { jetError: null };
      const label = `${employeeLabel ?? employeeId} : preset [${changes.join(", ")}] (par ${actor.label})`;
      const jetError = await writeJet130Server({ establishmentId, organizationId, label });
      return { jetError };
    },
    onSuccess: ({ jetError }, { employeeId }) => {
      void queryClient.invalidateQueries({
        queryKey: permissionsQueryKey(employeeId, establishmentId, organizationId),
      });
      notifyJetError(jetError);
    },
  });
}
