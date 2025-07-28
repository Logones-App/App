import { toast } from "sonner";

import type { Database } from "@/lib/supabase/database.types";

import { realtimeService, type RealtimeMessage } from "../../realtime-service";

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

          if (!payload) {
            console.warn("⚠️ Payload undefined pour l'événement organisation");
            return;
          }

          const event = this.createOrganizationEvent(payload);
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

          if (!payload) {
            console.warn("⚠️ Payload undefined pour l'événement utilisateur organisation");
            return;
          }

          const event = this.createUserOrganizationEvent(payload, organizationId);
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
   * Créer un événement d'organisation à partir du payload
   */
  private createOrganizationEvent(payload: Record<string, unknown>): OrganizationRealtimeEvent {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;

    return {
      type: this.getEventType(payload.eventType as string),
      organizationId: (newData?.id as string) ?? (oldData?.id as string),
      data: (newData as Organization | UserOrganization | null) ?? (oldData as Organization | UserOrganization | null),
      userId: (newData?.user_id as string) ?? (oldData?.user_id as string),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Créer un événement utilisateur d'organisation à partir du payload
   */
  private createUserOrganizationEvent(
    payload: Record<string, unknown>,
    organizationId: string,
  ): OrganizationRealtimeEvent {
    const newData = payload.new as Record<string, unknown>;
    const oldData = payload.old as Record<string, unknown>;
    const eventType = payload.eventType as string;

    return {
      type: eventType === "INSERT" ? "user_added" : "user_removed",
      organizationId,
      data: (newData as Organization | UserOrganization | null) ?? (oldData as Organization | UserOrganization | null),
      userId: (newData?.user_id as string) ?? (oldData?.user_id as string),
      timestamp: new Date().toISOString(),
    };
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
