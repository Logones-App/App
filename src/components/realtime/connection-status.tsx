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
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        };
      case "connecting":
        return {
          icon: Loader2,
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 animate-pulse",
        };
      case "error":
        return {
          icon: AlertCircle,
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        };
      default:
        return {
          icon: WifiOff,
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-600 hover:bg-gray-100",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center justify-center p-1 ${config.className}`}
      title={
        connectionStatus === "connected"
          ? "Temps réel actif"
          : connectionStatus === "connecting"
            ? "Connexion en cours..."
            : connectionStatus === "error"
              ? "Erreur de connexion"
              : "Hors ligne"
      }
    >
      <Icon className="h-3 w-3" />
    </Badge>
  );
}
