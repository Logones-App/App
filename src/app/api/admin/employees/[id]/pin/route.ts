import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: employeeId } = await params;
    const body = (await req.json()) as { pin_code?: string };
    const pin = body.pin_code?.trim() ?? "";

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir 4 à 6 chiffres" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { error } = await svc.from("employees").update({ pin_code: pin }).eq("id", employeeId).eq("deleted", false);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/employees/[id]/pin error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
