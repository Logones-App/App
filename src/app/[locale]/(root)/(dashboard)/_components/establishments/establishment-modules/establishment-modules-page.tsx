"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEstablishmentDevices } from "@/lib/queries/devices-queries";
import {
  useEstablishmentModules,
  useToggleEstablishmentModule,
  useSetActiveDevice,
} from "@/lib/queries/establishment-modules-queries";

import { BackToEstablishmentButton } from "../back-to-establishment-button";

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

export function EstablishmentModulesPage({ establishmentId, organizationId }: EstablishmentModulesPageProps) {
  const { data: modules = [], isLoading } = useEstablishmentModules(establishmentId, organizationId);
  const { data: devices = [] } = useEstablishmentDevices(establishmentId);
  const toggleModule = useToggleEstablishmentModule(establishmentId, organizationId);
  const setActiveDevice = useSetActiveDevice(establishmentId, organizationId);

  const moduleMap = new Map(modules.map((m) => [m.module, m]));
  const isPending = toggleModule.isPending || setActiveDevice.isPending;

  const handleToggle = (module: string, enabled: boolean) => {
    toggleModule.mutate({ module, enabled }, { onError: () => toast.error("Erreur lors de la mise à jour du module") });
  };

  const handleDeviceChange = (module: string, deviceId: string) => {
    setActiveDevice.mutate(
      { module, deviceId: deviceId === "none" ? null : deviceId },
      { onError: () => toast.error("Erreur lors de l'assignation du device") },
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
          Activez les modules disponibles et assignez-les aux devices correspondants.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(MODULE_DEFINITIONS).map(([moduleId, def]) => {
          const row = moduleMap.get(moduleId);
          const isEnabled = row?.enabled ?? false;
          const activeDeviceId = row?.active_device_id ?? null;

          return (
            <Card key={moduleId} className={!isEnabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{def.label}</CardTitle>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={(v) => handleToggle(moduleId, v)} disabled={isPending} />
                </div>
              </CardHeader>
              {isEnabled && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">Device actif</p>
                    <Select
                      value={activeDeviceId ?? "none"}
                      onValueChange={(v) => handleDeviceChange(moduleId, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Aucun device assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Aucun</span>
                        </SelectItem>
                        {devices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            <span className="flex items-center gap-2">
                              {device.serial_number}
                              <Badge variant="outline" className="text-[10px]">
                                {device.device_role}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
