"use client";

import { Edit, Trash2, Plus, Smartphone, Tablet, Monitor, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

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
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "phone":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      case "pos":
        return <Monitor className="h-4 w-4" />;
      case "kiosk":
        return <Wrench className="h-4 w-4" />;
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
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getDeviceIcon(device.device_type)}
                <CardTitle className="text-lg">{device.name}</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">ID Device:</span>
                <span className="text-muted-foreground text-sm">{device.device_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Type:</span>
                <span className="text-muted-foreground text-sm capitalize">{device.device_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Dernière activité:</span>
                <span className="text-muted-foreground text-sm">
                  {device.last_seen ? new Date(device.last_seen).toLocaleString("fr-FR") : "Jamais"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Créé le:</span>
                <span className="text-muted-foreground text-sm">
                  {device.created_at ? new Date(device.created_at).toLocaleDateString("fr-FR") : "Non défini"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
