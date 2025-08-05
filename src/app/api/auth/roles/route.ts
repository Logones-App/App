import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Récupérer l'utilisateur actuel
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    console.log("API - User metadata:", user.user_metadata);
    console.log("API - App metadata:", user.app_metadata);

    // Vérifier si c'est un system_admin via les métadonnées
    const systemRole = user.app_metadata?.role ?? user.user_metadata?.role;

    if (systemRole === "system_admin") {
      console.log("API - User is system_admin (from metadata)");
      return NextResponse.json({
        role: "system_admin",
        organizationId: null,
      });
    }

    // Vérifier si c'est un org_admin via users_organizations
    const { data: orgRole, error: orgError } = await supabase
      .from("users_organizations")
      .select(
        `
        organization_id,
        organizations (*)
      `,
      )
      .eq("user_id", user.id)
      .eq("deleted", false)
      .single();

    console.log("API - Org role check:", { orgRole, orgError });

    if (orgRole) {
      return NextResponse.json({
        role: "org_admin",
        organizationId: orgRole.organization_id,
        organization: orgRole.organizations,
      });
    }

    // Si aucun rôle trouvé, retourner null
    return NextResponse.json({ role: null });
  } catch (error) {
    console.error("API Roles - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
