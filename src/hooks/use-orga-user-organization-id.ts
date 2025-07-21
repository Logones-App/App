"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook pour récupérer l'ID d'organisation unique d'un utilisateur org_admin
 * Retourne null si non trouvé ou si l'utilisateur n'est pas org_admin
 */
export function useOrgaUserOrganizationId() {
  const { user } = useAuthStore();
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchOrg = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .maybeSingle();
      if (data && data.organization_id) setOrganizationId(data.organization_id);
      else setOrganizationId(null);
    };
    fetchOrg();
  }, [user]);

  return organizationId;
} 