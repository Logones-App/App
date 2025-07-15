import { useEffect, useCallback } from 'react';
import { organizationsRealtime, type OrganizationRealtimeEvent } from '@/lib/services/realtime/modules';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUserMetadata } from '@/hooks/use-user-metadata';

export function useOrganizationsRealtime() {
  const { user } = useAuthStore();
  const { userMetadata } = useUserMetadata();

  /**
   * S'abonner aux changements des organisations
   */
  const subscribeToOrganizations = useCallback((
    onEvent?: (event: OrganizationRealtimeEvent) => void
  ) => {
    return organizationsRealtime.subscribeToOrganizations(onEvent);
  }, []);

  /**
   * S'abonner aux utilisateurs d'une organisation
   */
  const subscribeToOrganizationUsers = useCallback((
    organizationId: string,
    onEvent?: (event: OrganizationRealtimeEvent) => void
  ) => {
    return organizationsRealtime.subscribeToOrganizationUsers(organizationId, onEvent);
  }, []);

  /**
   * Envoyer une notification d'organisation
   */
  const sendOrganizationNotification = useCallback(async (
    title: string,
    message: string,
    organizationId: string,
    data?: any
  ) => {
    if (!user) return;
    
    await organizationsRealtime.sendOrganizationNotification(
      title,
      message,
      organizationId,
      data
    );
  }, [user]);

  /**
   * Envoyer une action d'organisation
   */
  const sendOrganizationAction = useCallback(async (
    action: string,
    organizationId: string,
    data?: any
  ) => {
    if (!user) return;
    
    await organizationsRealtime.sendOrganizationAction(
      action,
      organizationId,
      data
    );
  }, [user]);

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
    unsubscribe
  };
} 