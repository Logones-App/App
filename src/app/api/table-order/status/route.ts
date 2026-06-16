import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const establishmentId = searchParams.get("est");
  const tableId = searchParams.get("table");

  if (!establishmentId || !tableId) {
    return NextResponse.json({ enabled: false, reason: "Paramètres manquants" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: table } = await service
    .from("tables")
    .select("id, name")
    .eq("id", tableId)
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ enabled: false, reason: "Table introuvable" });
  }

  const { data: session } = await service
    .from("device_sessions")
    .select("employee_id, orga_user_id")
    .eq("establishment_id", establishmentId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ enabled: false, reason: "Commandes désactivées. Demandez un serveur." });
  }

  return NextResponse.json({ enabled: true });
}
