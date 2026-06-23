import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

function generateSecurePassword(): string {
  return (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 24);
}

async function buildOrgaUser(svc: Svc, establishmentId: string): Promise<{ email: string; password: string }> {
  const { data: est, error: estErr } = await svc
    .from("establishments")
    .select("organization_id, slug")
    .eq("id", establishmentId)
    .single();
  if (estErr ?? !est) throw new Error("Établissement introuvable");
  if (!est.slug)
    throw new Error("L'établissement n'a pas de slug — configurez-en un avant de créer le compte tablette");

  const email = `${est.slug}@logones.internal`;
  const password = generateSecurePassword();
  let userId: string | null = null;

  const { data: newUser, error: authError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "orga_user" },
  });
  if (authError) throw authError;
  userId = newUser.user.id;

  const { error: uoError } = await svc.from("users_organizations").insert({
    user_id: userId,
    organization_id: est.organization_id,
    role: "manager",
    establishment_id: establishmentId,
  });

  if (uoError) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw uoError;
  }

  return { email, password };
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

    if (existing) {
      return NextResponse.json({ error: "Un compte tablette existe déjà pour cet établissement" }, { status: 409 });
    }

    const tabletCredentials = await buildOrgaUser(svc, establishmentId);
    return NextResponse.json({ tabletCredentials });
  } catch (err) {
    console.error("POST /api/admin/establishments/[id]/orga-user error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
