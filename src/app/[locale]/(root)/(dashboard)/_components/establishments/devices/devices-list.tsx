"use client";

import { Edit, Monitor, Plus, Smartphone, Tablet, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

const MOD_LABELS: Record<string, string> = {
  pos: "POS",
  kds: "KDS",
  haccp: "HACCP",
  hr: "RH",
  booking: "Résa",
};

const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  slave: "Slave",
};

const DISPLAY_LABELS: Record<string, string> = {
  landscape: "Paysage",
  portrait: "Portrait",
};

interface DevicesListProps {
  devices: Device[];
  isLoading: boolean;
  error: Error | null;
  onCreateClick: () => void;
  onEditClick: (device: Device) => void;
  onDeleteClick: (deviceId: string) => void;
  isCreateLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
}

export function DevicesList({
  devices,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  isCreateLoading,
  isUpdateLoading,
  isDeleteLoading,
}: DevicesListProps) {
  const getDeviceIcon = (deviceRole: string) => {
    switch (deviceRole) {
      case "master":
        return <Monitor className="h-4 w-4" />;
      case "slave":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Actif</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactif</Badge>;
      case "maintenance":
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground flex items-center justify-center py-8">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-destructive mb-4">Erreur lors du chargement des devices</div>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="py-8 text-center">
        <Smartphone className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">Aucun device</h3>
        <p className="text-muted-foreground mb-4">Aucun device trouvé pour cet établissement</p>
        <Button onClick={onCreateClick} disabled={isCreateLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter le premier device
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <Card key={device.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {getDeviceIcon(device.device_role)}
                <CardTitle className="text-base">{device.serial_number}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(device.status)}
                <Button variant="outline" size="sm" onClick={() => onEditClick(device)} disabled={isUpdateLoading}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDeleteClick(device.id)} disabled={isDeleteLoading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rôle</span>
                <span className="font-medium">{ROLE_LABELS[device.device_role] ?? device.device_role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orientation</span>
                <span className="font-medium">{DISPLAY_LABELS[device.display] ?? device.display}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fabricant</span>
                <span>{device.manufacturer ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modèle</span>
                <span>{device.model ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière synchro</span>
                <span>{device.last_sync_at ? new Date(device.last_sync_at).toLocaleString("fr-FR") : "Jamais"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span>{device.created_at ? new Date(device.created_at).toLocaleDateString("fr-FR") : "—"}</span>
              </div>
            </div>
            {device.mods.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {device.mods.map((mod) => (
                  <Badge key={mod} variant="secondary" className="text-xs">
                    {MOD_LABELS[mod] ?? mod}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
