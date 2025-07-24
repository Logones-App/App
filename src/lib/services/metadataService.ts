import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

// Types pour les métadonnées
export interface AppMetadata {
  role: "system_admin" | "org_admin" | null;
  provider: string;
  providers: string[];
  subscription_tier: "free" | "premium" | "enterprise";
  permissions: string[];
  features: string[];
  access_level: "system" | "organization" | "user";
  created_by: string;
  last_role_update: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: "fr" | "en";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    layout: "grid" | "list" | "compact";
    default_view: "overview" | "analytics" | "users" | "settings";
    refresh_interval: number;
  };
  accessibility: {
    high_contrast: boolean;
    font_size: "small" | "medium" | "large";
    reduced_motion: boolean;
  };
}

export interface UserProfile {
  avatar_url: string | null;
  bio: string;
  timezone: string;
  date_format: string;
  time_format: "12h" | "24h";
}

export interface UserMetadata {
  role: "system_admin" | "org_admin" | null;
  firstname: string;
  lastname: string;
  email_verified: boolean;
  preferences: UserPreferences;
  profile: UserProfile;
  last_login: string;
  login_count: number;
}

export class MetadataService {
  private static supabase = createClient();

  /**
   * Récupère les métadonnées app de l'utilisateur
   */
  static getAppMetadata(user: User): AppMetadata {
    const defaultAppMetadata: AppMetadata = {
      role: null,
      provider: "email",
      providers: ["email"],
      subscription_tier: "free",
      permissions: ["read"],
      features: ["dashboard"],
      access_level: "user",
      created_by: "system",
      last_role_update: new Date().toISOString(),
    };

    return { ...defaultAppMetadata, ...user.app_metadata };
  }

  /**
   * Récupère les métadonnées user de l'utilisateur
   */
  static getUserMetadata(user: User): UserMetadata {
    const defaultUserMetadata: UserMetadata = {
      role: null,
      firstname: "",
      lastname: "",
      email_verified: false,
      preferences: {
        theme: "auto",
        language: "fr",
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        dashboard: {
          layout: "grid",
          default_view: "overview",
          refresh_interval: 30000,
        },
        accessibility: {
          high_contrast: false,
          font_size: "medium",
          reduced_motion: false,
        },
      },
      profile: {
        avatar_url: null,
        bio: "",
        timezone: "Europe/Paris",
        date_format: "DD/MM/YYYY",
        time_format: "24h",
      },
      last_login: new Date().toISOString(),
      login_count: 0,
    };

    return { ...defaultUserMetadata, ...user.user_metadata };
  }

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  static hasPermission(user: User, permission: string): boolean {
    const appMetadata = this.getAppMetadata(user);
    return appMetadata.permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a accès à une feature spécifique
   */
  static hasFeature(user: User, feature: string): boolean {
    const appMetadata = this.getAppMetadata(user);
    return appMetadata.features.includes(feature);
  }

  /**
   * Récupère le niveau d'accès de l'utilisateur
   */
  static getAccessLevel(user: User): "system" | "organization" | "user" {
    const appMetadata = this.getAppMetadata(user);
    return appMetadata.access_level;
  }

  /**
   * Récupère le rôle principal de l'utilisateur
   */
  static getMainRole(user: User): "system_admin" | "org_admin" | null {
    const appMetadata = this.getAppMetadata(user);
    const userMetadata = this.getUserMetadata(user);

    // Priorité à app_metadata (plus sécurisé)
    return appMetadata.role || userMetadata.role;
  }

  /**
   * Récupère les préférences utilisateur
   */
  static getUserPreferences(user: User): UserPreferences {
    const userMetadata = this.getUserMetadata(user);
    return userMetadata.preferences;
  }

  /**
   * Récupère le profil utilisateur
   */
  static getUserProfile(user: User): UserProfile {
    const userMetadata = this.getUserMetadata(user);
    return userMetadata.profile;
  }

  /**
   * Met à jour les préférences utilisateur
   */
  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: {
          preferences: preferences,
        },
      });

      if (error) {
        console.error("Erreur lors de la mise à jour des préférences:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      return false;
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  static async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: {
          profile: profile,
        },
      });

      if (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur est un system admin
   */
  static isSystemAdmin(user: User): boolean {
    return this.getMainRole(user) === "system_admin";
  }

  /**
   * Vérifie si l'utilisateur est un org admin
   */
  static isOrgAdmin(user: User): boolean {
    return this.getMainRole(user) === "org_admin";
  }

  /**
   * Récupère le nom complet de l'utilisateur
   */
  static getFullName(user: User): string {
    const userMetadata = this.getUserMetadata(user);
    return `${userMetadata.firstname} ${userMetadata.lastname}`.trim();
  }

  /**
   * Récupère le nom d'affichage (nom complet ou email)
   */
  static getDisplayName(user: User): string {
    const fullName = this.getFullName(user);
    return fullName || user.email || "Utilisateur";
  }
}
