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
    return data;
  }

  async getCustomDomainsByEstablishment(establishmentId: string): Promise<CustomDomain[]> {
    const { data, error } = await this.supabase
      .from("custom_domains")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
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
   * Valide la longueur d'un domaine
   */
  private validateDomainLength(domain: string): { isValid: boolean; error?: string } {
    if (domain.length < 3) {
      return { isValid: false, error: "Le domaine doit faire au moins 3 caractères" };
    }
    if (domain.length > 253) {
      return { isValid: false, error: "Le domaine ne peut pas dépasser 253 caractères" };
    }
    return { isValid: true };
  }

  /**
   * Valide le format de base d'un domaine
   */
  private validateDomainFormat(domain: string): { isValid: boolean; error?: string } {
    // Format de base (lettres, chiffres, tirets, points) - validation manuelle pour éviter les problèmes de sécurité
    const domainParts = domain.split(".");
    for (const part of domainParts) {
      if (part.length === 0) {
        return { isValid: false, error: "Format de domaine invalide" };
      }

      // Vérifier que chaque partie commence et finit par une lettre ou chiffre
      if (!/^[a-z0-9]/.test(part) || !/[a-z0-9]$/.test(part)) {
        return { isValid: false, error: "Format de domaine invalide" };
      }

      // Vérifier que chaque partie ne contient que des lettres, chiffres et tirets
      if (!/^[a-z0-9-]+$/.test(part)) {
        return { isValid: false, error: "Format de domaine invalide" };
      }
    }
    return { isValid: true };
  }

  /**
   * Valide les parties d'un domaine
   */
  private validateDomainParts(domain: string): { isValid: boolean; error?: string } {
    const parts = domain.split(".");
    for (const part of parts) {
      if (part.length === 0) {
        return { isValid: false, error: "Le domaine ne peut pas contenir de points consécutifs" };
      }
      if (part.length > 63) {
        return { isValid: false, error: "Chaque partie du domaine ne peut pas dépasser 63 caractères" };
      }
    }
    return { isValid: true };
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

    // Longueur
    const lengthValidation = this.validateDomainLength(trimmedDomain);
    if (!lengthValidation.isValid) {
      return lengthValidation;
    }

    // Format de base
    const formatValidation = this.validateDomainFormat(trimmedDomain);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Vérifier qu'il y a au moins un point (TLD)
    if (!trimmedDomain.includes(".")) {
      return { isValid: false, error: "Le domaine doit contenir au moins un point (ex: .com)" };
    }

    // Vérifier que ça ne commence ou finit pas par un tiret
    if (trimmedDomain.startsWith("-") || trimmedDomain.endsWith("-")) {
      return { isValid: false, error: "Le domaine ne peut pas commencer ou finir par un tiret" };
    }

    // Vérifier les parties du domaine
    return this.validateDomainParts(trimmedDomain);
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
