import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

/**
 * Service centralisé pour la gestion des établissements
 * Centralise toutes les opérations liées aux établissements
 */
export class EstablishmentService {
  /**
   * Récupère un établissement par son slug
   * @param slug - Le slug de l'établissement
   * @returns L'établissement ou null si non trouvé
   */
  static async getBySlug(slug: string): Promise<Establishment | null> {
    try {
      console.log("🔍 Recherche de l'établissement avec le slug:", slug);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select(
          `
          id,
          name,
          slug,
          description,
          address,
          phone,
          email,
          logo_url,
          cover_image_url,
          website,
          is_public,
          organization_id,
          created_at,
          updated_at,
          deleted
        `,
        )
        .eq("slug", slug)
        .eq("deleted", false)
        .single();

      if (error) {
        console.error("❌ Erreur lors de la récupération de l'établissement:", error);
        return null;
      }

      if (!data) {
        console.log("⚠️ Aucun établissement trouvé avec le slug:", slug);
        return null;
      }

      // Vérifier si l'établissement est public
      if (!data.is_public) {
        console.log("🚫 Établissement non public:", data.name);
        return null;
      }

      console.log("✅ Établissement trouvé:", data.name);
      return data as Establishment;
    } catch (error) {
      console.error("💥 Erreur inattendue lors de la récupération de l'établissement:", error);
      return null;
    }
  }

  /**
   * Récupère plusieurs établissements
   * @param filters - Filtres optionnels
   * @returns Liste des établissements
   */
  static async getAll(filters?: { isPublic?: boolean; organizationId?: string }): Promise<Establishment[]> {
    try {
      console.log("🔍 Récupération des établissements avec filtres:", filters);

      const supabase = createClient();
      let query = supabase
        .from("establishments")
        .select(
          `
          id,
          name,
          slug,
          description,
          address,
          phone,
          email,
          logo_url,
          cover_image_url,
          website,
          is_public,
          organization_id,
          created_at,
          updated_at,
          deleted
        `,
        )
        .eq("deleted", false);

      // Appliquer les filtres
      if (filters?.isPublic !== undefined) {
        query = query.eq("is_public", filters.isPublic);
      }

      if (filters?.organizationId) {
        query = query.eq("organization_id", filters.organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Erreur lors de la récupération des établissements:", error);
        return [];
      }

      console.log("✅ Établissements trouvés:", data?.length || 0);
      return (data || []) as Establishment[];
    } catch (error) {
      console.error("💥 Erreur inattendue lors de la récupération des établissements:", error);
      return [];
    }
  }

  /**
   * Vérifie si un établissement existe et est accessible
   * @param slug - Le slug de l'établissement
   * @returns true si accessible, false sinon
   */
  static async isAccessible(slug: string): Promise<boolean> {
    const establishment = await this.getBySlug(slug);
    return establishment !== null;
  }

  /**
   * Récupère les informations publiques d'un établissement
   * @param slug - Le slug de l'établissement
   * @returns Les informations publiques ou null
   */
  static async getPublicInfo(slug: string): Promise<{
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  } | null> {
    const establishment = await this.getBySlug(slug);

    if (!establishment) {
      return null;
    }

    return {
      name: establishment.name,
      description: establishment.description ?? "",
      address: establishment.address ?? "",
      phone: establishment.phone ?? "",
      email: establishment.email ?? "",
      website: establishment.website ?? "",
    };
  }
}
