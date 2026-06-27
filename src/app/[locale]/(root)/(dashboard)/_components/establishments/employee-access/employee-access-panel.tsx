"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useEmployeePermissionsAccess,
  useSetEmployeePermissions,
  useTogglePermission,
} from "@/lib/queries/employee-access-queries";
import type { Database } from "@/lib/supabase/database.types";

import { PERMISSION_GROUPS, presetForRole, ROLE_LABELS, type PermissionGroup } from "./access-constants";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

function PermissionGroupCard({
  group,
  activeKeys,
  onToggle,
  disabled,
}: {
  group: PermissionGroup;
  activeKeys: Set<string>;
  onToggle: (key: string, grant: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-medium">{group.label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {group.permissions.map((perm) => (
          <label key={perm.key} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={activeKeys.has(perm.key)}
              onCheckedChange={(v) => onToggle(perm.key, Boolean(v))}
              disabled={disabled}
            />
            <span className="text-sm">{perm.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface EmployeeAccessPanelProps {
  employee: Employee;
  establishmentId: string;
  organizationId: string;
}

export function EmployeeAccessPanel({ employee, establishmentId, organizationId }: EmployeeAccessPanelProps) {
  const { data: permissions = [], isLoading } = useEmployeePermissionsAccess(
    employee.id,
    establishmentId,
    organizationId,
  );
  const togglePermission = useTogglePermission(establishmentId, organizationId);
  const setPermissions = useSetEmployeePermissions(establishmentId, organizationId);

  const activeKeys = new Set(permissions.map((p) => p.permission));
  const disabled = isLoading || togglePermission.isPending || setPermissions.isPending;

  const presetKeys = presetForRole(employee.role);
  const roleLabel =
    employee.role && employee.role in ROLE_LABELS ? ROLE_LABELS[employee.role as "server" | "manager"] : null;

  const handleToggle = (key: string, grant: boolean) => {
    togglePermission.mutate(
      { employeeId: employee.id, permission: key, grant },
      { onError: () => toast.error("Erreur lors de la mise à jour du droit") },
    );
  };

  const handleApplyPreset = () => {
    if (!confirm(`Appliquer le preset « ${roleLabel} » ? Les droits actuels seront remplacés par ceux du rôle.`))
      return;
    setPermissions.mutate(
      { employeeId: employee.id, keys: presetKeys },
      {
        onSuccess: () => toast.success("Preset appliqué"),
        onError: () => toast.error("Erreur lors de l'application du preset"),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <CardTitle className="text-base">
              {employee.lastname} {employee.firstname}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{roleLabel ?? employee.job_title ?? "—"}</p>
          </div>
          {presetKeys.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleApplyPreset} disabled={disabled}>
              Appliquer le preset {roleLabel}
            </Button>
          )}
          {employee.has_mobile_access ? (
            <Badge variant="default" className="ml-auto">
              Accès mobile actif
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground ml-auto">
              Pas d&apos;accès mobile
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!employee.has_mobile_access && (
          <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
            Cet employé n&apos;a pas accès à l&apos;application mobile. Activez l&apos;accès mobile dans sa fiche pour
            que ces droits prennent effet.
          </p>
        )}
        {PERMISSION_GROUPS.map((group) => (
          <PermissionGroupCard
            key={group.id}
            group={group}
            activeKeys={activeKeys}
            onToggle={handleToggle}
            disabled={disabled}
          />
        ))}
      </CardContent>
    </Card>
  );
}
