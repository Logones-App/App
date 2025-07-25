import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { bookingsRealtime, type BookingRealtimeEvent } from "@/lib/services/realtime/modules";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useBookingsRealtime() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  /**
   * S'abonner aux changements des bookings d'un établissement
   */
  const subscribeToEstablishmentBookings = useCallback(
    (establishmentId: string, organizationId: string, onEvent?: (event: BookingRealtimeEvent) => void) => {
      const unsubscribe = bookingsRealtime.subscribeToEstablishmentBookings(establishmentId, organizationId, (event) => {
        // Invalider le cache TanStack Query
        queryClient.invalidateQueries({
          queryKey: ["establishment-bookings", establishmentId, organizationId]
        });
        
        // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
        // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
      });

      return unsubscribe;
    },
    [queryClient],
  );

  /**
   * S'abonner aux changements des bookings d'une organisation
   */
  const subscribeToOrganizationBookings = useCallback(
    (organizationId: string, onEvent?: (event: BookingRealtimeEvent) => void) => {
      const unsubscribe = bookingsRealtime.subscribeToOrganizationBookings(organizationId, (event) => {
        // Invalider le cache TanStack Query
        queryClient.invalidateQueries({
          queryKey: ["organization-bookings", organizationId]
        });
        
        // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
        // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
      });

      return unsubscribe;
    },
    [queryClient],
  );

  /**
   * Envoyer une notification de booking
   */
  const sendBookingNotification = useCallback(
    async (
      title: string,
      message: string,
      bookingId: string,
      establishmentId: string,
      organizationId: string,
      data?: any
    ) => {
      if (!user) return;

      await bookingsRealtime.sendBookingNotification(
        title,
        message,
        bookingId,
        establishmentId,
        organizationId,
        data
      );
    },
    [user],
  );

  /**
   * Envoyer une action de booking
   */
  const sendBookingAction = useCallback(
    async (
      action: string,
      bookingId: string,
      establishmentId: string,
      organizationId: string,
      data?: any
    ) => {
      if (!user) return;

      await bookingsRealtime.sendBookingAction(
        action,
        bookingId,
        establishmentId,
        organizationId,
        data
      );
    },
    [user],
  );

  /**
   * Se désabonner de tous les abonnements
   */
  const unsubscribe = useCallback(() => {
    bookingsRealtime.unsubscribe();
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
    subscribeToEstablishmentBookings,
    subscribeToOrganizationBookings,
    sendBookingNotification,
    sendBookingAction,
    unsubscribe,
  };
} 