import { toast } from "sonner";

import type { Database } from "@/lib/supabase/database.types";

import { realtimeService, type RealtimeMessage } from "../../realtimeService";

// Types Supabase
type User = Database["public"]["Tables"]["users"]["Row"];

export interface UserRealtimeEvent {
  type: "user_created" | "user_updated" | "user_deleted" | "user_logged_in" | "user_logged_out" | "role_changed";
  userId: string;
  data: User | null;
  organizationId?: string;
  timestamp: string;
}

export class UsersRealtimeModule {
  private subscriptionIds: string[] = [];

  /**
   * S'abonner aux changements des utilisateurs
   */
  subscribeToUsers(onEvent?: (event: UserRealtimeEvent) => void) {
    const subscriptionId = realtimeService.subscribeToTable("users", "*", undefined, (message: RealtimeMessage) => {
      if (message.type === "data_update") {
        const payload = message.data;
        const event: UserRealtimeEvent = {
          type: this.getEventType(payload.eventType),
          userId: payload.new?.id || payload.old?.id,
          data: payload.new || payload.old,
          organizationId: payload.new?.organization_id || payload.old?.organization_id,
          timestamp: new Date().toISOString(),
        };

        this.handleUserEvent(event);
        onEvent?.(event);
      }
    });

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * S'abonner aux changements de rôles utilisateur
   */
  subscribeToUserRoles(onEvent?: (event: UserRealtimeEvent) => void) {
    const subscriptionId = realtimeService.subscribeToTable(
      "users_organizations",
      "*",
      undefined,
      (message: RealtimeMessage) => {
        if (message.type === "data_update") {
          const payload = message.data;
          const event: UserRealtimeEvent = {
            type: "role_changed",
            userId: payload.new?.user_id || payload.old?.user_id,
            data: null, // Pas de données utilisateur directes ici
            organizationId: payload.new?.organization_id || payload.old?.organization_id,
            timestamp: new Date().toISOString(),
          };

          this.handleUserEvent(event);
          onEvent?.(event);
        }
      },
    );

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * Envoyer une notification utilisateur
   */
  async sendUserNotification(title: string, message: string, userId: string, data?: Partial<User>) {
    await realtimeService.sendNotification(title, message, { ...data, userId }, userId);
  }

  /**
   * Envoyer une action utilisateur
   */
  async sendUserAction(action: string, userId: string, data?: Partial<User>) {
    await realtimeService.sendUserAction(
      `Action utilisateur: ${action}`,
      `Action effectuée par l'utilisateur ${userId}`,
      { action, userId, ...data },
    );
  }

  /**
   * Notifier une connexion utilisateur
   */
  async notifyUserLogin(userId: string, userData: Partial<User>) {
    await realtimeService.sendNotification(
      "Connexion utilisateur",
      `L'utilisateur ${userData.email} s'est connecté`,
      { userId, userData, type: "login" },
      undefined,
      userData.organization_id || undefined,
    );
  }

  /**
   * Notifier une déconnexion utilisateur
   */
  async notifyUserLogout(userId: string, userData: Partial<User>) {
    await realtimeService.sendNotification(
      "Déconnexion utilisateur",
      `L'utilisateur ${userData.email} s'est déconnecté`,
      { userId, userData, type: "logout" },
      undefined,
      userData.organization_id || undefined,
    );
  }

  /**
   * Gérer les événements utilisateur
   */
  private handleUserEvent(event: UserRealtimeEvent) {
    switch (event.type) {
      case "user_created":
        toast.success("Nouvel utilisateur créé");
        break;
      case "user_updated":
        toast.info("Utilisateur mis à jour");
        break;
      case "user_deleted":
        toast.warning("Utilisateur supprimé");
        break;
      case "user_logged_in":
        toast.success("Utilisateur connecté");
        break;
      case "user_logged_out":
        toast.info("Utilisateur déconnecté");
        break;
      case "role_changed":
        toast.info("Rôle utilisateur modifié");
        break;
    }
  }

  /**
   * Déterminer le type d'événement
   */
  private getEventType(eventType: string): UserRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "user_created";
      case "UPDATE":
        return "user_updated";
      case "DELETE":
        return "user_deleted";
      default:
        return "user_updated";
    }
  }

  /**
   * Se désabonner de tous les abonnements
   */
  unsubscribe() {
    this.subscriptionIds.forEach((id) => {
      realtimeService.unsubscribe(id);
    });
    this.subscriptionIds = [];
  }
}

export const usersRealtime = new UsersRealtimeModule();
