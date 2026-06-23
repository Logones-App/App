import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function generateSecurePassword(): string {
  return (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 24);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: establishmentId } = await params;
    const svc = createServiceClient();

    const { data: existing } = await svc
      .from("users_organizations")
      .select("user_id")
      .eq("establishment_id", establishmentId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Aucun compte tablette pour cet établissement" }, { status: 404 });
    }

    const password = generateSecurePassword();
    const { data: updatedUser, error: updateError } = await svc.auth.admin.updateUserById(existing.user_id, {
      password,
    });
    if (updateError) throw updateError;

    const email = updatedUser.user.email ?? "";
    return NextResponse.json({ tabletCredentials: { email, password } });
  } catch (err) {
    console.error("POST /api/admin/establishments/[id]/orga-user/reset error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
