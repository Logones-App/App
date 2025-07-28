import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export class RoleService {
  private static supabase = createClient();

  static async isSystemAdmin(user: User): Promise<boolean> {
    const systemRole = user.app_metadata?.role ?? user.user_metadata?.role;
    return systemRole === "system_admin";
  }

  static async isOrgAdmin(user: User): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("users_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erreur lors de la vérification org_admin:", error);
        return false;
      }

      return Boolean(data);
    } catch (error) {
      console.error("Erreur lors de la vérification org_admin:", error);
      return false;
    }
  }

  static async getUserRole(user: User): Promise<"system_admin" | "org_admin" | null> {
    // Vérifier d'abord system_admin via métadonnées
    const systemRole = user.app_metadata?.role ?? user.user_metadata?.role;

    if (systemRole === "system_admin") {
      return "system_admin";
    }

    // Vérifier org_admin via users_organizations
    try {
      const { data, error } = await this.supabase
        .from("users_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erreur lors de la récupération du rôle:", error);
        return null;
      }

      return data ? "org_admin" : null;
    } catch (error) {
      console.error("Erreur lors de la récupération du rôle:", error);
      return null;
    }
  }

  static async setUserRole(userId: string, role: "system_admin" | "org_admin"): Promise<boolean> {
    try {
      if (role === "system_admin") {
        // Pour system_admin, mettre à jour les métadonnées
        const { error } = await this.supabase.auth.admin.updateUserById(userId, {
          app_metadata: { role: "system_admin" },
          user_metadata: { role: "system_admin" },
        });

        if (error) {
          console.error("Erreur lors de la mise à jour des métadonnées:", error);
          return false;
        }

        // Supprimer l'organisation si elle existe
        await this.supabase
          .from("users_organizations")
          .update({ deleted: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("deleted", false);

        return true;
      } else {
        // Pour org_admin, on ne met pas à jour les métadonnées
        // L'organisation est gérée via users_organizations
        return true;
      }
    } catch (error) {
      console.error("Erreur lors de la définition du rôle:", error);
      return false;
    }
  }
}

export const roleService = new RoleService();
