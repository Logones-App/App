import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usersRealtime, type UserRealtimeEvent } from "@/lib/services/realtime/modules";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useUsersRealtime() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  /**
   * S'abonner aux changements des utilisateurs
   */
  const subscribeToUsers = useCallback((onEvent?: (event: UserRealtimeEvent) => void) => {
    const subscriptionId = usersRealtime.subscribeToUsers((event) => {
      // Invalider le cache TanStack Query
      queryClient.invalidateQueries({
        queryKey: ["all-users"]
      });
      
      // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
      // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
    });
    
    return subscriptionId;
  }, [queryClient]);

  /**
   * S'abonner aux changements de rôles utilisateur
   */
  const subscribeToUserRoles = useCallback((onEvent?: (event: UserRealtimeEvent) => void) => {
    const subscriptionId = usersRealtime.subscribeToUserRoles((event) => {
      // Invalider le cache TanStack Query
      queryClient.invalidateQueries({
        queryKey: ["user-roles"]
      });
      
      // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
      // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
    });
    
    return subscriptionId;
  }, [queryClient]);

  /**
   * Envoyer une notification utilisateur
   */
  const sendUserNotification = useCallback(
    async (title: string, message: string, userId: string, data?: any) => {
      if (!user) return;

      await usersRealtime.sendUserNotification(
        title,
        message,
        userId,
        data
      );
    },
    [user],
  );

  /**
   * Envoyer une action utilisateur
   */
  const sendUserAction = useCallback(
    async (action: string, userId: string, data?: any) => {
      if (!user) return;

      await usersRealtime.sendUserAction(
        action,
        userId,
        data
      );
    },
    [user],
  );

  /**
   * Notifier une connexion utilisateur
   */
  const notifyUserLogin = useCallback(
    async (userId: string, userData: any) => {
      if (!user) return;

      await usersRealtime.notifyUserLogin(
        userId,
        userData
      );
    },
    [user],
  );

  /**
   * Notifier une déconnexion utilisateur
   */
  const notifyUserLogout = useCallback(
    async (userId: string, userData: any) => {
      if (!user) return;

      await usersRealtime.notifyUserLogout(
        userId,
        userData
      );
    },
    [user],
  );

  /**
   * Se désabonner de tous les abonnements
   */
  const unsubscribe = useCallback(() => {
    usersRealtime.unsubscribe();
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
    subscribeToUsers,
    subscribeToUserRoles,
    sendUserNotification,
    sendUserAction,
    notifyUserLogin,
    notifyUserLogout,
    unsubscribe,
  };
} 