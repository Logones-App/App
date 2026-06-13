import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (userData.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const service = createServiceClient();
    const { data, error } = await service
      .from("organizations")
      .select("id, name, establishments(id, name)")
      .eq("deleted", false)
      .order("name");
    if (error) throw error;

    return NextResponse.json({ organizations: data });
  } catch (err) {
    console.error("GET /api/admin/organizations:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
