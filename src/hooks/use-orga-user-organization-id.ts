// HOOK MONO-ORGA :
// Ce hook retourne l'ID d'organisation unique d'un utilisateur org_admin (mono-orga).
// Si l'utilisateur est lié à plusieurs organisations, seul le premier résultat est retourné.
// Pour supporter le multi-orga, il faudrait retourner un tableau d'ID d'organisations (voir TODO).

"use client";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook pour récupérer l'ID d'organisation unique d'un utilisateur org_admin
 * Retourne null si non trouvé ou si l'utilisateur n'est pas org_admin
 *
 * ⚠️ Ce hook est MONO-ORGA : il ne retourne qu'un seul ID d'organisation.
 *    Pour le multi-orga, il faudrait retourner un tableau d'ID (à généraliser si besoin).
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
