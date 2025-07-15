import { useEffect, useCallback, useRef } from 'react';
import { useRealtimeStore } from '@/lib/stores/realtime-store';
import { realtimeService, type RealtimeMessage } from '@/lib/services/realtimeService';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUserMetadata } from '@/hooks/use-user-metadata';

/**
 * Hook principal pour utiliser le realtime
 */
export function useRealtime() {
  const {
    isConnected,
    connectionStatus,
    messages,
    notifications,
    unreadCount,
    subscriptions,
    connect,
    disconnect,
    addMessage,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearMessages,
    clearNotifications,
    addSubscription,
    removeSubscription
  } = useRealtimeStore();

  const { user } = useAuthStore();
  const { userMetadata } = useUserMetadata();
  const connectionAttempted = useRef(false);

  // Connexion automatique quand l'utilisateur est connecté
  useEffect(() => {
    if (user && !isConnected && !connectionAttempted.current) {
      connectionAttempted.current = true;
      connect();
    } else if (!user && isConnected) {
      connectionAttempted.current = false;
      disconnect();
    }
  }, [user, isConnected]); // Retirer connect et disconnect des dépendances

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []); // Dépendances vides pour éviter les boucles

  return {
    isConnected,
    connectionStatus,
    messages,
    notifications,
    unreadCount,
    subscriptions,
    connect,
    disconnect,
    addMessage,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearMessages,
    clearNotifications,
    addSubscription,
    removeSubscription
  };
}

/**
 * Hook pour s'abonner aux changements d'une table
 */
export function useTableSubscription(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter?: string,
  onMessage?: (message: RealtimeMessage) => void
) {
  const { addSubscription, removeSubscription } = useRealtimeStore();

  const subscribe = useCallback(() => {
    const subscriptionId = realtimeService.subscribeToTable(
      table,
      event,
      filter,
      onMessage
    );

    const subscription = realtimeService.getActiveSubscriptions().find(
      sub => sub.id === subscriptionId
    );

    if (subscription) {
      addSubscription(subscription);
    }

    return subscriptionId;
  }, [table, event, filter, onMessage, addSubscription]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    removeSubscription(subscriptionId);
  }, [removeSubscription]);

  return { subscribe, unsubscribe };
}

/**
 * Hook pour les notifications temps réel
 */
export function useRealtimeNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useRealtimeStore();
  const { user } = useAuthStore();
  const { userMetadata } = useUserMetadata();

  const sendNotification = useCallback(async (
    title: string,
    message: string,
    data?: any,
    targetUserId?: string,
    targetOrganizationId?: string
  ) => {
    if (!user) return;

    await realtimeService.sendNotification(
      title,
      message,
      data,
      targetUserId,
      targetOrganizationId
    );
  }, [user]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    sendNotification
  };
}

/**
 * Hook pour les actions utilisateur temps réel
 */
export function useRealtimeUserActions() {
  const { user } = useAuthStore();

  const sendUserAction = useCallback(async (
    title: string,
    message: string,
    data?: any
  ) => {
    if (!user) return;

    await realtimeService.sendUserAction(
      title,
      message,
      data,
      user.id
    );
  }, [user]);

  return { sendUserAction };
}

/**
 * Hook pour s'abonner aux notifications personnalisées
 */
export function useNotificationSubscription(
  onMessage?: (message: RealtimeMessage) => void
) {
  const { user } = useAuthStore();
  const { addSubscription, removeSubscription } = useRealtimeStore();

  const subscribe = useCallback(() => {
    const subscriptionId = realtimeService.subscribeToNotifications(
      user?.id,
      undefined, // Pas d'organization_id dans userMetadata pour l'instant
      onMessage
    );

    const subscription = realtimeService.getActiveSubscriptions().find(
      sub => sub.id === subscriptionId
    );

    if (subscription) {
      addSubscription(subscription);
    }

    return subscriptionId;
  }, [user?.id, onMessage, addSubscription]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    removeSubscription(subscriptionId);
  }, [removeSubscription]);

  return { subscribe, unsubscribe };
}

/**
 * Hook pour s'abonner aux actions utilisateur
 */
export function useUserActionSubscription(
  onMessage?: (message: RealtimeMessage) => void
) {
  const { user } = useAuthStore();
  const { addSubscription, removeSubscription } = useRealtimeStore();

  const subscribe = useCallback(() => {
    const subscriptionId = realtimeService.subscribeToUserActions(
      user?.id,
      onMessage
    );

    const subscription = realtimeService.getActiveSubscriptions().find(
      sub => sub.id === subscriptionId
    );

    if (subscription) {
      addSubscription(subscription);
    }

    return subscriptionId;
  }, [user?.id, onMessage, addSubscription]);

  const unsubscribe = useCallback((subscriptionId: string) => {
    removeSubscription(subscriptionId);
  }, [removeSubscription]);

  return { subscribe, unsubscribe };
} 