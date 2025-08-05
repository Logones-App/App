import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { GalleryImage, GallerySection, GallerySectionImage } from "@/types/gallery";

export interface GalleryRealtimeEvent {
  type:
    | "image_created"
    | "image_updated"
    | "image_deleted"
    | "section_image_added"
    | "section_image_removed"
    | "section_image_reordered";
  imageId?: string;
  sectionImageId?: string;
  establishmentId: string;
  organizationId: string;
  section?: GallerySection;
  data: Record<string, unknown>;
  timestamp: string;
}

class GalleryRealtime {
  private subscriptions: RealtimeChannel[] = [];

  /**
   * S'abonner aux changements des images de galerie d'un établissement
   */
  subscribeToGalleryImages(
    establishmentId: string,
    organizationId: string,
    onEvent?: (event: GalleryRealtimeEvent) => void,
  ) {
    console.log(`🔔 S'abonner aux changements des images de galerie pour l'établissement ${establishmentId}...`);

    const supabase = createClient();

    const subscription = supabase
      .channel(`gallery_images_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "establishment_gallery",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: Record<string, unknown>) => {
          const record = payload.new ?? payload.old;
          if (record && (record as Record<string, unknown>).organization_id === organizationId) {
            const event: GalleryRealtimeEvent = {
              type: this.getGalleryEventType(payload.eventType as string),
              imageId: (record as Record<string, unknown>).id as string,
              establishmentId: (record as Record<string, unknown>).establishment_id as string,
              organizationId: (record as Record<string, unknown>).organization_id as string,
              data: (payload.new ?? payload.old) as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            };

            console.log("📡 Gallery realtime event:", event.type, (record as Record<string, unknown>).id);
            this.handleGalleryEvent(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * S'abonner aux changements des images de section d'un établissement
   */
  subscribeToSectionImages(
    establishmentId: string,
    organizationId: string,
    section?: GallerySection,
    onEvent?: (event: GalleryRealtimeEvent) => void,
  ) {
    console.log(`🔔 S'abonner aux changements des images de section pour l'établissement ${establishmentId}...`);

    const supabase = createClient();

    // ✅ SOLUTION VALIDÉE : UN SEUL FILTRE MAXIMUM
    const filter = `establishment_id=eq.${establishmentId}`; // ← UN SEUL FILTRE

    const subscription = supabase
      .channel(`gallery_sections_${establishmentId}_${section ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "establishment_gallery_sections",
          filter, // ← UN SEUL FILTRE
        },
        (payload: Record<string, unknown>) => {
          const record = payload.new ?? payload.old;
          if (record && (record as Record<string, unknown>).organization_id === organizationId) {
            // ✅ FILTRAGE CÔTÉ CLIENT si une section est spécifiée
            const recordSection = (record as Record<string, unknown>).section as GallerySection;
            if (section && recordSection !== section) {
              return; // Ignorer les événements pour d'autres sections
            }

            const event: GalleryRealtimeEvent = {
              type: this.getSectionEventType(payload.eventType as string),
              sectionImageId: (record as Record<string, unknown>).id as string,
              imageId: (record as Record<string, unknown>).image_id as string,
              establishmentId: (record as Record<string, unknown>).establishment_id as string,
              organizationId: (record as Record<string, unknown>).organization_id as string,
              section: recordSection,
              data: (payload.new ?? payload.old) as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            };

            console.log("📡 Gallery section realtime event:", event.type, (record as Record<string, unknown>).id);
            this.handleSectionEvent(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Se désabonner de tous les canaux
   */
  unsubscribe() {
    console.log("🧹 Désabonnement de tous les canaux de galerie");
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }

  /**
   * Gérer les événements de galerie
   */
  private handleGalleryEvent(event: GalleryRealtimeEvent) {
    switch (event.type) {
      case "image_created":
        toast.success("Nouvelle image ajoutée à la galerie");
        break;
      case "image_updated":
        toast.success("Image mise à jour");
        break;
      case "image_deleted":
        toast.success("Image supprimée");
        break;
    }
  }

  /**
   * Gérer les événements de section
   */
  private handleSectionEvent(event: GalleryRealtimeEvent) {
    switch (event.type) {
      case "section_image_added":
        toast.success("Image ajoutée à la section");
        break;
      case "section_image_removed":
        toast.success("Image retirée de la section");
        break;
      case "section_image_reordered":
        toast.success("Ordre des images mis à jour");
        break;
    }
  }

  /**
   * Déterminer le type d'événement de galerie
   */
  private getGalleryEventType(eventType: string): GalleryRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "image_created";
      case "UPDATE":
        return "image_updated";
      case "DELETE":
        return "image_deleted";
      default:
        return "image_updated";
    }
  }

  /**
   * Déterminer le type d'événement de section
   */
  private getSectionEventType(eventType: string): GalleryRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "section_image_added";
      case "UPDATE":
        return "section_image_reordered";
      case "DELETE":
        return "section_image_removed";
      default:
        return "section_image_added";
    }
  }
}

export const galleryRealtime = new GalleryRealtime();
