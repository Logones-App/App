import { NextRequest, NextResponse } from "next/server";

import { signJet } from "@/lib/nf525/sign-jet";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// JET 130 « modification droit employé certifiant » — signé CÔTÉ SERVEUR (ECDSA = service_role/Edge,
// impossible depuis le navigateur). Appelé par les mutations de droits employé après la modification.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: establishmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = (await req.json()) as { label?: string };
    if (!body.label) return NextResponse.json({ error: "Label requis" }, { status: 400 });

    // Org réelle de l'établissement (jamais celle fournie par le client) + contrôle d'appartenance.
    const svc = createServiceClient();
    const { data: est } = await svc
      .from("establishments")
      .select("organization_id")
      .eq("id", establishmentId)
      .maybeSingle();
    if (!est?.organization_id) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin") {
      const { data: membership } = await svc
        .from("users_organizations")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("organization_id", est.organization_id)
        .limit(1)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const jetErr = await signJet({
      establishmentId,
      organizationId: est.organization_id,
      code: 130,
      label: body.label,
    });
    if (jetErr) return NextResponse.json({ error: jetErr }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
