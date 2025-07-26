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

  async addCustomDomain(domain: string, establishmentId: string, establishmentSlug: string, organizationId: string) {
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
    const { error } = await this.supabase
      .from("custom_domains")
      .update({ is_active: false })
      .eq("id", domainId);

    return { error };
  }

  /**
   * Vérifie si un domaine est un domaine personnalisé
   */
  isCustomDomain(hostname: string): boolean {
    // Exclure les domaines de développement et le domaine principal
    const excludedDomains = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "your-vps.com", // Remplacer par ton vrai domaine
      "your-domain.com", // Remplacer par ton vrai domaine
    ];

    return !excludedDomains.some(domain => hostname.includes(domain));
  }
} 