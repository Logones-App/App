"use client";

import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealtime } from "@/hooks/use-realtime";

export function RealtimeConnectionStatus() {
  const { connectionStatus } = useRealtime();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: Wifi,
          label: "Connecté",
          variant: "default" as const,
          className: "text-green-600",
        };
      case "connecting":
        return {
          icon: Loader2,
          label: "Connexion...",
          variant: "secondary" as const,
          className: "text-yellow-600 animate-spin",
        };
      case "error":
        return {
          icon: AlertCircle,
          label: "Erreur",
          variant: "destructive" as const,
          className: "text-red-600",
        };
      default:
        return {
          icon: WifiOff,
          label: "Déconnecté",
          variant: "outline" as const,
          className: "text-gray-600",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${config.className}`} />
      <span className="text-xs">{config.label}</span>
    </Badge>
  );
}
