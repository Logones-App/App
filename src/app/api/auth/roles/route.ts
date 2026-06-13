import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError ?? !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const appRole = user.app_metadata?.role as string | undefined;

    if (appRole === "system_admin") {
      return NextResponse.json({ role: "system_admin", organizationId: null });
    }

    if (appRole === "commercial") {
      const { data: orgs } = await supabase
        .from("users_organizations")
        .select("organization_id, organizations(id, name)")
        .eq("user_id", user.id)
        .eq("deleted", false);
      return NextResponse.json({ role: "commercial", organizations: orgs ?? [] });
    }

    if (appRole === "employee") {
      const { data: employee } = await supabase
        .from("employees")
        .select("id, establishment_id, organization_id")
        .eq("auth_user_id", user.id)
        .eq("deleted", false)
        .maybeSingle();
      return NextResponse.json({ role: "employee", employee: employee ?? null });
    }

    const { data: orgRow } = await supabase
      .from("users_organizations")
      .select("organization_id, role, establishment_id, organizations(*)")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .maybeSingle();

    if (orgRow?.role === "manager") {
      return NextResponse.json({
        role: "manager",
        organizationId: orgRow.organization_id,
        establishmentId: orgRow.establishment_id,
        organization: orgRow.organizations,
      });
    }

    if (orgRow?.role === "org_admin") {
      return NextResponse.json({
        role: "org_admin",
        organizationId: orgRow.organization_id,
        organization: orgRow.organizations,
      });
    }

    return NextResponse.json({ role: null });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
