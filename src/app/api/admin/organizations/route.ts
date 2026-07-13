import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_ORG_VAT_RATES, ensureOrgVatRates } from "@/lib/server/establishment-provisioning";
import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
import { generateSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

async function createOrgAdmin(svc: Svc, email: string, name: string, orgId: string): Promise<void> {
  const { data: created, error } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { role: "org_admin" },
  });
  if (error) throw error;

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
  if (actionLink) await sendInvitationEmail(email, name, actionLink);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = (await req.json()) as {
      name?: string | null;
      description?: string | null;
      subscription_plan?: string | null;
      org_admin_email?: string | null;
      org_admin_name?: string | null;
    };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const svc = createServiceClient();
    const slug = `${generateSlug(body.name.trim())}-${Math.random().toString(36).slice(2, 7)}`;

    const { data, error } = await svc
      .from("organizations")
      .insert({
        name: body.name.trim(),
        slug,
        description: body.description ?? null,
        subscription_plan: body.subscription_plan ?? "starter",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Taux de TVA standard seedés au niveau ORG (idempotent, non bloquant).
    try {
      await ensureOrgVatRates(svc, data.id, DEFAULT_ORG_VAT_RATES);
    } catch (vatErr) {
      console.error("Seed TVA org échoué (non bloquant):", vatErr);
    }

    let orgAdminError: string | null = null;
    if (body.org_admin_email?.trim()) {
      try {
        await createOrgAdmin(svc, body.org_admin_email.trim(), body.org_admin_name?.trim() ?? "", data.id);
      } catch (err) {
        orgAdminError = err instanceof Error ? err.message : "Erreur création compte admin";
        console.error("createOrgAdmin failed:", err);
      }
    }

    return NextResponse.json({ orgId: data.id, orgAdminError }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/organizations error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}

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
