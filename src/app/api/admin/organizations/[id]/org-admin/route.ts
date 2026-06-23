import { NextRequest, NextResponse } from "next/server";

import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: orgId } = await params;
    const body = (await req.json()) as { email?: string; name?: string };
    const email = body.email?.trim();
    const name = body.name?.trim() ?? "";

    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

    const svc = createServiceClient();

    const { data: org } = await svc.from("organizations").select("id").eq("id", orgId).single();
    if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });

    const { data: created, error: createError } = await svc.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role: "org_admin" },
    });
    if (createError) throw createError;

    const userId = created.user.id;
    const { error: uoError } = await svc.from("users_organizations").insert({
      user_id: userId,
      organization_id: orgId,
      role: "org_admin",
    });

    if (uoError) {
      await svc.auth.admin.deleteUser(userId).catch(() => {});
      throw uoError;
    }

    const { data: linkData } = await svc.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: INVITATION_REDIRECT_URL },
    });
    const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;

    let emailSent = false;
    if (actionLink) {
      emailSent = await sendInvitationEmail(email, name || email, actionLink);
    }

    return NextResponse.json({ userId, emailSent }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/organizations/[id]/org-admin error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
