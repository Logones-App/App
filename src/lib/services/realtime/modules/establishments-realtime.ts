import { realtimeService, type RealtimeMessage } from '../../realtimeService';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/database.types';

// Types Supabase
type Establishment = Database['public']['Tables']['establishments']['Row'];
type Menu = Database['public']['Tables']['menus']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

export interface EstablishmentRealtimeEvent {
  type: 'establishment_created' | 'establishment_updated' | 'establishment_deleted' | 'menu_updated' | 'status_changed' | 'order_received';
  establishmentId: string;
  data: Establishment | Menu | Order | null;
  organizationId?: string;
  userId?: string;
  timestamp: string;
}

export class EstablishmentsRealtimeModule {
  private subscriptionIds: string[] = [];

  /**
   * S'abonner aux changements des établissements
   */
  subscribeToEstablishments(organizationId?: string, onEvent?: (event: EstablishmentRealtimeEvent) => void) {
    const filter = organizationId ? `organization_id=eq.${organizationId}` : undefined;
    
    const subscriptionId = realtimeService.subscribeToTable(
      'establishments',
      '*',
      filter,
      (message: RealtimeMessage) => {
        if (message.type === 'data_update') {
          const payload = message.data;
          const event: EstablishmentRealtimeEvent = {
            type: this.getEventType(payload.eventType),
            establishmentId: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
            organizationId: payload.new?.organization_id || payload.old?.organization_id,
            userId: payload.new?.user_id || payload.old?.user_id,
            timestamp: new Date().toISOString()
          };

          this.handleEstablishmentEvent(event);
          onEvent?.(event);
        }
      }
    );

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * S'abonner aux changements de menus
   */
  subscribeToMenus(establishmentId: string, onEvent?: (event: EstablishmentRealtimeEvent) => void) {
    const subscriptionId = realtimeService.subscribeToTable(
      'menus',
      '*',
      `establishment_id=eq.${establishmentId}`,
      (message: RealtimeMessage) => {
        if (message.type === 'data_update') {
          const payload = message.data;
          const event: EstablishmentRealtimeEvent = {
            type: 'menu_updated',
            establishmentId,
            data: payload.new || payload.old,
            organizationId: payload.new?.organization_id || payload.old?.organization_id,
            userId: payload.new?.user_id || payload.old?.user_id,
            timestamp: new Date().toISOString()
          };

          this.handleEstablishmentEvent(event);
          onEvent?.(event);
        }
      }
    );

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * S'abonner aux commandes d'un établissement
   */
  subscribeToOrders(establishmentId: string, onEvent?: (event: EstablishmentRealtimeEvent) => void) {
    const subscriptionId = realtimeService.subscribeToTable(
      'orders',
      '*',
      `establishment_id=eq.${establishmentId}`,
      (message: RealtimeMessage) => {
        if (message.type === 'data_update') {
          const payload = message.data;
          const event: EstablishmentRealtimeEvent = {
            type: 'order_received',
            establishmentId,
            data: payload.new || payload.old,
            organizationId: payload.new?.organization_id || payload.old?.organization_id,
            userId: payload.new?.user_id || payload.old?.user_id,
            timestamp: new Date().toISOString()
          };

          this.handleEstablishmentEvent(event);
          onEvent?.(event);
        }
      }
    );

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * Envoyer une notification d'établissement
   */
  async sendEstablishmentNotification(
    title: string,
    message: string,
    establishmentId: string,
    organizationId?: string,
    data?: Partial<Establishment>
  ) {
    await realtimeService.sendNotification(
      title,
      message,
      { ...data, establishmentId },
      undefined,
      organizationId
    );
  }

  /**
   * Notifier une nouvelle commande
   */
  async notifyNewOrder(orderData: Partial<Order>) {
    await realtimeService.sendNotification(
      'Nouvelle commande',
      `Nouvelle commande reçue`,
      { orderData, type: 'new_order' },
      undefined,
      orderData.organization_id || undefined
    );
  }

  /**
   * Notifier un changement de statut
   */
  async notifyStatusChange(establishmentId: string, oldStatus: string, newStatus: string) {
    await realtimeService.sendNotification(
      'Changement de statut',
      `Le statut de l'établissement a changé de ${oldStatus} à ${newStatus}`,
      { establishmentId, oldStatus, newStatus, type: 'status_change' }
    );
  }

  /**
   * Gérer les événements d'établissement
   */
  private handleEstablishmentEvent(event: EstablishmentRealtimeEvent) {
    switch (event.type) {
      case 'establishment_created':
        toast.success('Nouvel établissement créé');
        break;
      case 'establishment_updated':
        toast.info('Établissement mis à jour');
        break;
      case 'establishment_deleted':
        toast.warning('Établissement supprimé');
        break;
      case 'menu_updated':
        toast.info('Menu mis à jour');
        break;
      case 'status_changed':
        toast.info('Statut de l\'établissement modifié');
        break;
      case 'order_received':
        toast.success('Nouvelle commande reçue');
        break;
    }
  }

  /**
   * Déterminer le type d'événement
   */
  private getEventType(eventType: string): EstablishmentRealtimeEvent['type'] {
    switch (eventType) {
      case 'INSERT':
        return 'establishment_created';
      case 'UPDATE':
        return 'establishment_updated';
      case 'DELETE':
        return 'establishment_deleted';
      default:
        return 'establishment_updated';
    }
  }

  /**
   * Se désabonner de tous les abonnements
   */
  unsubscribe() {
    this.subscriptionIds.forEach(id => {
      realtimeService.unsubscribe(id);
    });
    this.subscriptionIds = [];
  }
}

export const establishmentsRealtime = new EstablishmentsRealtimeModule(); 