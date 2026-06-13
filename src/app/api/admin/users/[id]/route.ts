import { NextRequest, NextResponse } from "next/server";

import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
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

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const service = createServiceClient();

  await service.from("users_organizations").update({ deleted: true }).eq("user_id", id);
  await service.from("employees").update({ auth_user_id: null, has_mobile_access: false }).eq("auth_user_id", id);

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/users/[id]
interface PatchBody {
  role: string;
  organizationId?: string | null;
  establishmentId?: string | null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as PatchBody;
  const { role, organizationId, establishmentId } = body;

  if (!role) return NextResponse.json({ error: "role requis" }, { status: 400 });

  const service = createServiceClient();

  // Si on quitte le rôle employee → délier la fiche employé
  const { data: current } = await service.auth.admin.getUserById(id);
  const previousRole = current.user?.app_metadata.role as string | undefined;
  if (previousRole === "employee" && role !== "employee") {
    await service.from("employees").update({ auth_user_id: null, has_mobile_access: false }).eq("auth_user_id", id);
  }

  // Mettre à jour app_metadata
  const { error: authError } = await service.auth.admin.updateUserById(id, { app_metadata: { role } });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Si on vient d'employee et qu'une org est fournie → INSERT (pas d'entrée existante)
  // Sinon → UPDATE de l'entrée existante
  if (organizationId) {
    if (previousRole === "employee") {
      const { error: orgError } = await service.from("users_organizations").insert({
        user_id: id,
        organization_id: organizationId,
        role,
        establishment_id: establishmentId ?? null,
      });
      if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
    } else {
      // Si le nouveau rôle est org_admin ou manager : soft-delete les orgs excédentaires
      if (role === "org_admin" || role === "manager") {
        await service
          .from("users_organizations")
          .update({ deleted: true })
          .eq("user_id", id)
          .neq("organization_id", organizationId)
          .eq("deleted", false);
      }
      const { error: orgError } = await service
        .from("users_organizations")
        .update({ role, establishment_id: establishmentId ?? null })
        .eq("user_id", id)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/users/[id] — renvoie l'email d'invitation
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: userData, error: fetchError } = await service.auth.admin.getUserById(id);
  if (fetchError || !userData.user.email) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const email = userData.user.email;
  const name = (userData.user.user_metadata.full_name as string | undefined) ?? "";

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: INVITATION_REDIRECT_URL },
  });
  const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (linkError ?? !actionLink) {
    return NextResponse.json({ error: "Impossible de générer le lien" }, { status: 500 });
  }

  const emailSent = await sendInvitationEmail(email, name, actionLink);

  return NextResponse.json({ ok: true, actionLink, emailSent });
}
