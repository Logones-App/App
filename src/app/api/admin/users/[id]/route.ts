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

async function sendInvitationEmail(to: string, name: string, actionLink: string): Promise<void> {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER!,
        pass: process.env.BREVO_SMTP_PASSWORD!,
      },
    });
    const displayName = name.trim() || to;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@logones.fr",
      to,
      subject: "Votre accès à la plateforme Logones",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Bienvenue sur Logones</h2>
          <p>Bonjour ${displayName},</p>
          <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${actionLink}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Définir mon mot de passe
            </a>
          </p>
          <p style="color:#71717a;font-size:13px">Ce lien est valable 24 heures.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendInvitationEmail:", err);
  }
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

  // Si le nouveau rôle est org_admin ou manager : une seule org autorisée
  // → soft-delete toutes les orgs sauf celle sélectionnée
  if ((role === "org_admin" || role === "manager") && organizationId) {
    await service
      .from("users_organizations")
      .update({ deleted: true })
      .eq("user_id", id)
      .neq("organization_id", organizationId)
      .eq("deleted", false);
  }

  // Mettre à jour le rôle dans users_organizations si une org est fournie
  if (organizationId) {
    const { error: orgError } = await service
      .from("users_organizations")
      .update({ role, establishment_id: establishmentId ?? null })
      .eq("user_id", id)
      .eq("organization_id", organizationId)
      .eq("deleted", false);
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
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

  const { data: linkData } = await service.auth.admin.generateLink({ type: "recovery", email });
  const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (!actionLink) {
    return NextResponse.json({ error: "Impossible de générer le lien" }, { status: 500 });
  }

  await sendInvitationEmail(email, name, actionLink);

  return NextResponse.json({ ok: true });
}
