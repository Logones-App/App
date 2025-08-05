import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type CustomDomain = Tables<"custom_domains">;

export class DomainService {
  private supabase = createClient();

  async getEstablishmentByDomain(domain: string): Promise<CustomDomain | null> {
    const { data, error } = await this.supabase
      .from("custom_domains")
      .select("*")
      .eq("domain", domain)
      .eq("is_active", true)
      .eq("deleted", false)
      .single();

    if (error) return null;
    return data;
  }

  async getAllActiveCustomDomains(): Promise<CustomDomain[]> {
    const { data, error } = await this.supabase
      .from("custom_domains")
      .select("*")
      .eq("is_active", true)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((record) => ({
      id: record.id,
      domain: record.domain,
      establishment_id: record.establishment_id,
      establishment_slug: record.establishment_slug,
      is_active: record.is_active,
      organization_id: record.organization_id,
      created_at: record.created_at,
      created_by: record.created_by,
      updated_at: record.updated_at,
      deleted: record.deleted,
    }));
  }

  async getCustomDomainsByEstablishment(establishmentId: string): Promise<CustomDomain[]> {
    const { data, error } = await this.supabase
      .from("custom_domains")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((record) => ({
      id: record.id,
      domain: record.domain,
      establishment_id: record.establishment_id,
      establishment_slug: record.establishment_slug,
      is_active: record.is_active,
      organization_id: record.organization_id,
      created_at: record.created_at,
      created_by: record.created_by,
      updated_at: record.updated_at,
      deleted: record.deleted,
    }));
  }

  async addCustomDomain(domain: string, establishmentId: string, establishmentSlug: string, organizationId: string) {
    // Validation du domaine avant ajout
    const validation = this.validateDomain(domain);
    if (!validation.isValid) {
      return { data: null, error: validation.error };
    }

    const { data, error } = await this.supabase
      .from("custom_domains")
      .insert({
        domain,
        establishment_id: establishmentId,
        establishment_slug: establishmentSlug,
        is_active: true,
        organization_id: organizationId,
      })
      .select()
      .single();

    return { data, error };
  }

  async deactivateDomain(domainId: string) {
    const { error } = await this.supabase.from("custom_domains").update({ is_active: false }).eq("id", domainId);

    return { error };
  }

  async deleteDomain(domainId: string) {
    const { error } = await this.supabase.from("custom_domains").update({ deleted: true }).eq("id", domainId);

    return { error };
  }

  /**
   * Valide le format d'un domaine
   */
  validateDomain(domain: string): { isValid: boolean; error?: string } {
    // Vérifications de base
    if (!domain || domain.trim().length === 0) {
      return { isValid: false, error: "Le domaine ne peut pas être vide" };
    }

    const trimmedDomain = domain.trim().toLowerCase();

    // ✅ REGEX ROBUSTE - Validation complète selon les standards RFC
    const domainRegex = /^(https?:\/\/)?(www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

    if (!domainRegex.test(trimmedDomain)) {
      return {
        isValid: false,
        error: "Format de domaine invalide. Utilisez un format comme 'example.com' ou 'mon-restaurant.fr'",
      };
    }

    // Vérifications supplémentaires pour les cas spécifiques
    if (trimmedDomain.includes("localhost") || trimmedDomain.includes("127.0.0.1")) {
      return { isValid: false, error: "Les domaines de développement ne sont pas autorisés" };
    }

    // Vérifier la longueur totale
    if (trimmedDomain.length > 253) {
      return { isValid: false, error: "Le domaine ne peut pas dépasser 253 caractères" };
    }

    // Vérifier la longueur minimale
    if (trimmedDomain.length < 3) {
      return { isValid: false, error: "Le domaine doit faire au moins 3 caractères" };
    }

    return { isValid: true };
  }

  /**
   * Vérifie si un domaine est un domaine personnalisé
   */
  isCustomDomain(hostname: string): boolean {
    // Exclure les domaines de développement et le domaine principal
    const mainDomain = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : "logones.fr";

    const excludedDomains = ["localhost", "127.0.0.1", "0.0.0.0", mainDomain];

    return !excludedDomains.some((domain) => hostname.includes(domain));
  }
}
