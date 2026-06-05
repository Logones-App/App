"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  useEmployeeModuleAccess,
  useEmployeePermissionsAccess,
  useToggleModuleAccess,
  useTogglePermission,
} from "@/lib/queries/employee-access-queries";
import type { Database } from "@/lib/supabase/database.types";

import { MODULES, type ModuleDefinition } from "./access-constants";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

interface ModuleAccessCardProps {
  module: ModuleDefinition;
  hasAccess: boolean;
  activePermissions: Set<string>;
  onToggleModule: (moduleId: string, grant: boolean) => void;
  onTogglePermission: (permission: string, grant: boolean) => void;
  isPending: boolean;
}

function ModuleAccessCard({
  module,
  hasAccess,
  activePermissions,
  onToggleModule,
  onTogglePermission,
  isPending,
}: ModuleAccessCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{module.label}</p>
          <p className="text-muted-foreground text-xs">{module.description}</p>
        </div>
        <Switch checked={hasAccess} onCheckedChange={(v) => onToggleModule(module.id, v)} disabled={isPending} />
      </div>
      {hasAccess && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {module.permissions.map((perm) => (
            <label key={perm.id} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={activePermissions.has(`${module.id}:${perm.id}`)}
                onCheckedChange={(v) => onTogglePermission(`${module.id}:${perm.id}`, Boolean(v))}
                disabled={isPending}
              />
              <span className="text-sm">{perm.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface EmployeeAccessPanelProps {
  employee: Employee;
  establishmentId: string;
  organizationId: string;
}

export function EmployeeAccessPanel({ employee, establishmentId, organizationId }: EmployeeAccessPanelProps) {
  const { data: moduleAccess = [], isLoading: loadingModules } = useEmployeeModuleAccess(
    employee.id,
    establishmentId,
    organizationId,
  );
  const { data: permissions = [], isLoading: loadingPerms } = useEmployeePermissionsAccess(
    employee.id,
    establishmentId,
    organizationId,
  );
  const toggleModule = useToggleModuleAccess(establishmentId, organizationId);
  const togglePermission = useTogglePermission(establishmentId, organizationId);

  const activeModules = new Set(moduleAccess.map((m) => m.module));
  const activePermissions = new Set(permissions.map((p) => p.permission));
  const isPending = toggleModule.isPending || togglePermission.isPending || loadingModules || loadingPerms;

  const handleToggleModule = (moduleId: string, grant: boolean) => {
    toggleModule.mutate(
      { employeeId: employee.id, module: moduleId, grant },
      {
        onError: () => toast.error("Erreur lors de la mise à jour de l'accès"),
      },
    );
  };

  const handleTogglePermission = (permission: string, grant: boolean) => {
    togglePermission.mutate(
      { employeeId: employee.id, permission, grant },
      {
        onError: () => toast.error("Erreur lors de la mise à jour de la permission"),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div>
            <CardTitle className="text-base">
              {employee.lastname} {employee.firstname}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{employee.job_title ?? employee.role ?? "—"}</p>
          </div>
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
            que ces permissions prennent effet.
          </p>
        )}
        {MODULES.map((mod) => (
          <ModuleAccessCard
            key={mod.id}
            module={mod}
            hasAccess={activeModules.has(mod.id)}
            activePermissions={activePermissions}
            onToggleModule={handleToggleModule}
            onTogglePermission={handleTogglePermission}
            isPending={isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
