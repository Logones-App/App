import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function assertSystemAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined;
  return role === "system_admin" ? data.user : null;
}

// GET /api/admin/employees?establishmentId=xxx
// Retourne les employés sans auth_user_id (pas encore liés à un compte)
export async function GET(req: NextRequest) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const establishmentId = req.nextUrl.searchParams.get("establishmentId");

  const service = createServiceClient();
  let query = service
    .from("employees")
    .select("id, firstname, lastname, email, establishment_id, organization_id")
    .is("auth_user_id", null)
    .eq("deleted", false)
    .eq("is_active", true)
    .order("lastname");

  if (establishmentId) {
    query = query.eq("establishment_id", establishmentId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ employees: data });
}
