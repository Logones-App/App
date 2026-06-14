import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type AppRole = "system_admin" | "commercial" | "account_manager" | "org_admin" | "manager" | "employee" | null;

export class RoleService {
  private static supabase = createClient();

  static isSystemAdmin(user: User): boolean {
    return (user.app_metadata.role ?? user.user_metadata.role) === "system_admin";
  }

  static isCommercial(user: User): boolean {
    return (user.app_metadata.role ?? user.user_metadata.role) === "commercial";
  }

  static isAccountManager(user: User): boolean {
    return (user.app_metadata.role ?? user.user_metadata.role) === "account_manager";
  }

  static isEmployee(user: User): boolean {
    return (user.app_metadata.role ?? user.user_metadata.role) === "employee";
  }

  static async isOrgAdmin(user: User): Promise<boolean> {
    const { data } = await this.supabase
      .from("users_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .maybeSingle();
    return data?.role === "org_admin";
  }

  static async isManager(user: User): Promise<boolean> {
    const { data } = await this.supabase
      .from("users_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .maybeSingle();
    return data?.role === "manager";
  }

  static async getUserRole(user: User): Promise<AppRole> {
    const appRole = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;

    if (appRole === "system_admin") return "system_admin";
    if (appRole === "commercial") return "commercial";
    if (appRole === "account_manager") return "account_manager";
    if (appRole === "employee") return "employee";

    const { data } = await this.supabase
      .from("users_organizations")
      .select("role, establishment_id, organization_id")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .maybeSingle();

    if (data?.role === "org_admin") return "org_admin";
    if (data?.role === "manager") return "manager";

    return null;
  }

  static async getUserOrgContext(user: User) {
    const { data } = await this.supabase
      .from("users_organizations")
      .select("organization_id, role, establishment_id")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .maybeSingle();
    return data ?? null;
  }
}

export const roleService = new RoleService();
