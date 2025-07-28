import { toast } from "sonner";

import type { Database } from "@/lib/supabase/database.types";

import { realtimeService, type RealtimeMessage } from "../../realtime-service";

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

        if (!payload) {
          console.warn("⚠️ Payload undefined pour l'événement utilisateur");
          return;
        }

        const event = this.createUserEvent(payload);
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

          if (!payload) {
            console.warn("⚠️ Payload undefined pour l'événement rôle utilisateur");
            return;
          }

          const event = this.createUserRoleEvent(payload);
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
      userData.organization_id ?? undefined,
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
      userData.organization_id ?? undefined,
    );
  }

  /**
   * Créer un événement utilisateur à partir du payload
   */
  private createUserEvent(payload: Record<string, unknown>): UserRealtimeEvent {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;

    return {
      type: this.getEventType(payload.eventType as string),
      userId: (newData?.id as string) ?? (oldData?.id as string),
      data: (newData as User | null) ?? (oldData as User | null),
      organizationId: (newData?.organization_id as string) ?? (oldData?.organization_id as string),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Créer un événement de rôle utilisateur à partir du payload
   */
  private createUserRoleEvent(payload: Record<string, unknown>): UserRealtimeEvent {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;

    return {
      type: "role_changed",
      userId: (newData?.user_id as string) ?? (oldData?.user_id as string),
      data: null, // Pas de données utilisateur directes ici
      organizationId: (newData?.organization_id as string) ?? (oldData?.organization_id as string),
      timestamp: new Date().toISOString(),
    };
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
