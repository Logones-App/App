import { toast } from "sonner";

import type { Database } from "@/lib/supabase/database.types";

import { realtimeService, type RealtimeMessage } from "../../realtimeService";

// Types Supabase
type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type UserOrganization = Database["public"]["Tables"]["users_organizations"]["Row"];

export interface OrganizationRealtimeEvent {
  type: "organization_created" | "organization_updated" | "organization_deleted" | "user_added" | "user_removed";
  organizationId: string;
  data: Organization | UserOrganization | null;
  userId?: string;
  timestamp: string;
}

export class OrganizationsRealtimeModule {
  private subscriptionIds: string[] = [];

  /**
   * S'abonner aux changements des organisations
   */
  subscribeToOrganizations(onEvent?: (event: OrganizationRealtimeEvent) => void) {
    console.log("🔔 S'abonner aux changements des organisations...");

    const subscriptionId = realtimeService.subscribeToTable(
      "organizations",
      "*",
      undefined,
      (message: RealtimeMessage) => {
        console.log("📡 Message realtime reçu:", message);

        if (message.type === "data_update") {
          const payload = message.data;
          console.log("📊 Payload organisation:", payload);

          const event: OrganizationRealtimeEvent = {
            type: this.getEventType(payload.eventType),
            organizationId: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
            userId: payload.new?.user_id || payload.old?.user_id,
            timestamp: new Date().toISOString(),
          };

          console.log("🎯 Événement organisation créé:", event);
          this.handleOrganizationEvent(event);
          onEvent?.(event);
        }
      },
    );

    console.log("✅ Abonnement organisations créé:", subscriptionId);
    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * S'abonner aux changements des utilisateurs d'une organisation
   */
  subscribeToOrganizationUsers(organizationId: string, onEvent?: (event: OrganizationRealtimeEvent) => void) {
    const subscriptionId = realtimeService.subscribeToTable(
      "users_organizations",
      "*",
      `organization_id=eq.${organizationId}`,
      (message: RealtimeMessage) => {
        if (message.type === "data_update") {
          const payload = message.data;
          const event: OrganizationRealtimeEvent = {
            type: payload.eventType === "INSERT" ? "user_added" : "user_removed",
            organizationId,
            data: payload.new || payload.old,
            userId: payload.new?.user_id || payload.old?.user_id,
            timestamp: new Date().toISOString(),
          };

          this.handleOrganizationEvent(event);
          onEvent?.(event);
        }
      },
    );

    this.subscriptionIds.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * Envoyer une notification d'organisation
   */
  async sendOrganizationNotification(
    title: string,
    message: string,
    organizationId: string,
    data?: Partial<Organization>,
  ) {
    await realtimeService.sendNotification(title, message, { ...data, organizationId }, undefined, organizationId);
  }

  /**
   * Envoyer une action utilisateur liée aux organisations
   */
  async sendOrganizationAction(action: string, organizationId: string, data?: Partial<Organization>) {
    await realtimeService.sendUserAction(
      `Action organisation: ${action}`,
      `Action effectuée sur l'organisation ${organizationId}`,
      { action, organizationId, ...data },
    );
  }

  /**
   * Gérer les événements d'organisation
   */
  private handleOrganizationEvent(event: OrganizationRealtimeEvent) {
    switch (event.type) {
      case "organization_created":
        toast.success("Nouvelle organisation créée");
        break;
      case "organization_updated":
        toast.info("Organisation mise à jour");
        break;
      case "organization_deleted":
        toast.warning("Organisation supprimée");
        break;
      case "user_added":
        toast.success("Utilisateur ajouté à l'organisation");
        break;
      case "user_removed":
        toast.info("Utilisateur retiré de l'organisation");
        break;
    }
  }

  /**
   * Déterminer le type d'événement
   */
  private getEventType(eventType: string): OrganizationRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "organization_created";
      case "UPDATE":
        return "organization_updated";
      case "DELETE":
        return "organization_deleted";
      default:
        return "organization_updated";
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

export const organizationsRealtime = new OrganizationsRealtimeModule();
