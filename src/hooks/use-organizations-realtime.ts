import { useEffect, useCallback } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { organizationsRealtime, type OrganizationRealtimeEvent } from "@/lib/services/realtime/modules";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useOrganizationsRealtime() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  /**
   * S'abonner aux changements des organisations
   */
  const subscribeToOrganizations = useCallback(
    (onEvent?: (event: OrganizationRealtimeEvent) => void) => {
      const subscriptionId = organizationsRealtime.subscribeToOrganizations((event) => {
        // Invalider le cache TanStack Query
        queryClient.invalidateQueries({
          queryKey: ["all-organizations"],
        });

        // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
        // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
      });

      return subscriptionId;
    },
    [queryClient],
  );

  /**
   * S'abonner aux utilisateurs d'une organisation
   */
  const subscribeToOrganizationUsers = useCallback(
    (organizationId: string, onEvent?: (event: OrganizationRealtimeEvent) => void) => {
      const subscriptionId = organizationsRealtime.subscribeToOrganizationUsers(organizationId, (event) => {
        // Invalider le cache TanStack Query
        queryClient.invalidateQueries({
          queryKey: ["organization-users", organizationId],
        });

        // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
        // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
      });

      return subscriptionId;
    },
    [queryClient],
  );

  /**
   * Envoyer une notification d'organisation
   */
  const sendOrganizationNotification = useCallback(
    async (title: string, message: string, organizationId: string, data?: any) => {
      if (!user) return;

      await organizationsRealtime.sendOrganizationNotification(title, message, organizationId, data);
    },
    [user],
  );

  /**
   * Envoyer une action d'organisation
   */
  const sendOrganizationAction = useCallback(
    async (action: string, organizationId: string, data?: any) => {
      if (!user) return;

      await organizationsRealtime.sendOrganizationAction(action, organizationId, data);
    },
    [user],
  );

  /**
   * Se désabonner de tous les abonnements
   */
  const unsubscribe = useCallback(() => {
    organizationsRealtime.unsubscribe();
  }, []);

  // Nettoyage automatique à la déconnexion
  useEffect(() => {
    return () => {
      if (!user) {
        unsubscribe();
      }
    };
  }, [user, unsubscribe]);

  return {
    subscribeToOrganizations,
    subscribeToOrganizationUsers,
    sendOrganizationNotification,
    sendOrganizationAction,
    unsubscribe,
  };
}
