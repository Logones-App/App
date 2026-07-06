"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateDevice } from "@/lib/queries/devices-mutations";
import { useEstablishmentDevices } from "@/lib/queries/devices-queries";
import {
  useEstablishmentModules,
  useToggleEstablishmentModule,
  useUpdateEstablishmentModuleSeats,
} from "@/lib/queries/establishment-modules-queries";
import type { Database } from "@/lib/supabase/database.types";

import { BackToEstablishmentButton } from "../back-to-establishment-button";

type Device = Database["public"]["Tables"]["devices"]["Row"];

const MODULE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  pos: { label: "Caisse (POS)", description: "Gestion des commandes et encaissements" },
  kds: { label: "Écran cuisine (KDS)", description: "Affichage des commandes en cuisine" },
  haccp: { label: "HACCP", description: "Traçabilité et sécurité alimentaire" },
  hr: { label: "RH & Planning", description: "Gestion des ressources humaines" },
  booking: { label: "Réservations", description: "Gestion des réservations clients" },
};

interface EstablishmentModulesPageProps {
  establishmentId: string;
  organizationId: string;
}

/** Liste des appareils avec (dé)attribution d'un module, bornée par les postes disponibles. */
function ModuleDeviceList({
  moduleId,
  devices,
  seats,
  busy,
  onToggle,
}: {
  moduleId: string;
  devices: Device[];
  seats: number;
  busy: boolean;
  onToggle: (device: Device, assign: boolean) => void;
}) {
  if (devices.length === 0) {
    return <p className="text-muted-foreground mt-3 text-xs">Aucun appareil dans cet établissement.</p>;
  }
  const used = devices.filter((d) => d.mods.includes(moduleId)).length;
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Appareils</p>
      {devices.map((device) => {
        const assigned = device.mods.includes(moduleId);
        const full = used >= seats;
        return (
          <label
            key={device.id}
            className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm"
          >
            <Checkbox
              checked={assigned}
              disabled={busy || (!assigned && full)}
              onCheckedChange={(v) => onToggle(device, v === true)}
            />
            <span className="min-w-0 flex-1 truncate">{device.serial_number}</span>
            {device.device_role === "master" && (
              <Badge variant="outline" className="text-[10px]">
                Master
              </Badge>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function EstablishmentModulesPage({ establishmentId, organizationId }: EstablishmentModulesPageProps) {
  const { data: modules = [], isLoading } = useEstablishmentModules(establishmentId, organizationId);
  const { data: devices = [] } = useEstablishmentDevices(establishmentId);
  const toggleModule = useToggleEstablishmentModule(establishmentId, organizationId);
  const updateSeats = useUpdateEstablishmentModuleSeats(establishmentId, organizationId);
  const updateDevice = useUpdateDevice();

  const moduleMap = new Map(modules.map((m) => [m.module, m]));
  const busy = toggleModule.isPending || updateSeats.isPending || updateDevice.isPending;

  const handleToggle = (module: string, enabled: boolean) => {
    toggleModule.mutate({ module, enabled }, { onError: () => toast.error("Erreur lors de la mise à jour du module") });
  };

  const handleSeats = (module: string, value: string) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) return;
    updateSeats.mutate({ module, seats }, { onError: () => toast.error("Erreur lors de la mise à jour des postes") });
  };

  const toggleAssign = (device: Device, moduleId: string, assign: boolean) => {
    const current = device.mods;
    const next = assign ? [...current, moduleId] : current.filter((m) => m !== moduleId);
    updateDevice.mutate(
      { id: device.id, updates: { mods: next } },
      { onError: () => toast.error("Erreur lors de l'attribution du module") },
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <h1 className="text-2xl font-bold">Modules de l&apos;établissement</h1>
        <p className="text-muted-foreground text-sm">
          Activez les modules, définissez le nombre de postes, et attribuez chaque module aux appareils.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(MODULE_DEFINITIONS).map(([moduleId, def]) => {
          const row = moduleMap.get(moduleId);
          const isEnabled = row?.enabled ?? false;
          const seats = row?.seats ?? 1;
          const used = devices.filter((d) => d.mods.includes(moduleId)).length;
          const over = used > seats;

          return (
            <Card key={moduleId} className={!isEnabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{def.label}</CardTitle>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={(v) => handleToggle(moduleId, v)} disabled={busy} />
                </div>
              </CardHeader>
              {isEnabled && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground text-sm">Postes</span>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={seats}
                      className="h-7 w-20 text-sm"
                      onBlur={(e) => handleSeats(moduleId, e.target.value)}
                      disabled={busy}
                    />
                    <Badge variant={over ? "destructive" : "secondary"} className="text-xs">
                      {used}/{seats} utilisé{used > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded">
                    <div
                      className={over ? "bg-destructive h-full" : "bg-primary h-full"}
                      style={{ width: `${seats > 0 ? Math.min(100, (used / seats) * 100) : 0}%` }}
                    />
                  </div>
                  <ModuleDeviceList
                    moduleId={moduleId}
                    devices={devices}
                    seats={seats}
                    busy={busy}
                    onToggle={(device, assign) => toggleAssign(device, moduleId, assign)}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
