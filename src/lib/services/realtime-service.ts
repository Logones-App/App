import { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export interface RealtimeMessage {
  id: string;
  type: "notification" | "data_update" | "user_action" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  user_id?: string;
  organization_id?: string;
  read?: boolean;
}

export interface RealtimeSubscription {
  id: string;
  channel: RealtimeChannel;
  table?: string;
  event?: string;
  filter?: string;
}

class RealtimeService {
  private supabase = createClient();
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private messageHandlers: Map<string, (message: RealtimeMessage) => void> = new Map();

  /**
   * S'abonner aux changements d'une table
   */
  subscribeToTable(
    table: string,
    event: "INSERT" | "UPDATE" | "DELETE" | "*",
    filter?: string,
    onMessage?: (message: RealtimeMessage) => void,
  ): string {
    const subscriptionId = `${table}_${event}_${filter ?? "all"}`;

    console.log(`🔔 Tentative d'abonnement à la table ${table} (${event})...`);

    if (this.subscriptions.has(subscriptionId)) {
      console.log(`⚠️ Abonnement ${subscriptionId} déjà existant`);
      return subscriptionId;
    }

    const channel = this.supabase
      .channel(subscriptionId)
      .on(
        "postgres_changes" as any,
        {
          event: event === "*" ? "*" : event.toLowerCase(),
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload: Record<string, unknown>) => {
          console.log(`📡 Événement reçu pour ${table}:`, payload);

          const message: RealtimeMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: "data_update",
            title: `Mise à jour ${table}`,
            message: `${event} sur ${table}`,
            data: payload,
            timestamp: new Date().toISOString(),
            user_id: this.extractUserId(payload),
            organization_id: this.extractOrganizationId(payload),
          };

          this.handleMessage(message);
          onMessage?.(message);
        },
      )
      .subscribe((status) => {
        console.log(`📊 Statut de l'abonnement ${subscriptionId}:`, status);
      });

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      channel,
      table,
      event,
      filter,
    };

    this.subscriptions.set(subscriptionId, subscription);
    console.log(`✅ Abonnement ${subscriptionId} créé avec succès`);
    return subscriptionId;
  }

  /**
   * S'abonner aux notifications personnalisées
   */
  subscribeToNotifications(
    userId?: string,
    organizationId?: string,
    onMessage?: (message: RealtimeMessage) => void,
  ): string {
    const subscriptionId = `notifications_${userId ?? "all"}_${organizationId ?? "all"}`;

    if (this.subscriptions.has(subscriptionId)) {
      return subscriptionId;
    }

    const channel = this.supabase
      .channel(subscriptionId)
      .on(
        "broadcast",
        {
          event: "notifications",
        },
        (payload) => {
          const message: RealtimeMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: "notification",
            title: payload.title ?? "Nouvelle notification",
            message: payload.message ?? "",
            data: payload.data,
            timestamp: new Date().toISOString(),
            user_id: payload.user_id,
            organization_id: payload.organization_id,
          };

          // Filtrer par utilisateur/organisation si spécifié
          if (userId && message.user_id && message.user_id !== userId) {
            return;
          }
          if (organizationId && message.organization_id && message.organization_id !== organizationId) {
            return;
          }

          this.handleMessage(message);
          onMessage?.(message);
        },
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      channel,
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * S'abonner aux actions utilisateur
   */
  subscribeToUserActions(userId?: string, onMessage?: (message: RealtimeMessage) => void): string {
    const subscriptionId = `user_actions_${userId ?? "all"}`;

    if (this.subscriptions.has(subscriptionId)) {
      return subscriptionId;
    }

    const channel = this.supabase
      .channel(subscriptionId)
      .on(
        "broadcast",
        {
          event: "user_actions",
        },
        (payload) => {
          const message: RealtimeMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: "user_action",
            title: payload.title ?? "Action utilisateur",
            message: payload.message ?? "",
            data: payload.data,
            timestamp: new Date().toISOString(),
            user_id: payload.user_id,
          };

          if (userId && message.user_id && message.user_id !== userId) {
            return;
          }

          this.handleMessage(message);
          onMessage?.(message);
        },
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      channel,
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * Envoyer une notification
   */
  async sendNotification(
    title: string,
    message: string,
    data?: Record<string, unknown>,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    const channel = this.supabase.channel("notifications");

    await channel.send({
      type: "broadcast",
      event: "notifications",
      payload: {
        title,
        message,
        data,
        user_id: userId,
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Envoyer une action utilisateur
   */
  async sendUserAction(title: string, message: string, data?: Record<string, unknown>, userId?: string): Promise<void> {
    const channel = this.supabase.channel("user_actions");

    await channel.send({
      type: "broadcast",
      event: "user_actions",
      payload: {
        title,
        message,
        data,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Se désabonner d'un canal
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Se désabonner de tous les canaux
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.channel.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Ajouter un gestionnaire de messages
   */
  addMessageHandler(id: string, handler: (message: RealtimeMessage) => void): void {
    this.messageHandlers.set(id, handler);
  }

  /**
   * Supprimer un gestionnaire de messages
   */
  removeMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  /**
   * Gérer les messages reçus
   */
  private handleMessage(message: RealtimeMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("Erreur dans le gestionnaire de message realtime:", error);
      }
    });
  }

  /**
   * Obtenir la liste des abonnements actifs
   */
  getActiveSubscriptions(): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Vérifier si un abonnement est actif
   */
  isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  /**
   * Extrait l'ID utilisateur du payload
   */
  private extractUserId(payload: Record<string, unknown>): string | undefined {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;

    if (typeof newData?.user_id === "string") {
      return newData.user_id;
    }
    if (typeof oldData?.user_id === "string") {
      return oldData.user_id;
    }
    return undefined;
  }

  /**
   * Extrait l'ID organisation du payload
   */
  private extractOrganizationId(payload: Record<string, unknown>): string | undefined {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;

    if (typeof newData?.organization_id === "string") {
      return newData.organization_id;
    }
    if (typeof oldData?.organization_id === "string") {
      return oldData.organization_id;
    }
    return undefined;
  }
}

export const realtimeService = new RealtimeService();
