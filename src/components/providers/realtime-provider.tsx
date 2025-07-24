"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { useRealtime } from "@/hooks/use-realtime";
import { useAuthStore } from "@/lib/stores/auth-store";

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isConnected, connectionStatus, connect, disconnect } = useRealtime();
  const { user } = useAuthStore();
  const t = useTranslations("common");

  // Initialiser la connexion realtime quand l'utilisateur est connecté
  useEffect(() => {
    if (user && !isConnected && connectionStatus === "disconnected") {
      connect();
    }
  }, [user, isConnected, connectionStatus, connect]);

  // Nettoyer à la déconnexion
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return <>{children}</>;
}
