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
          <p>Votre compte a été créé. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${actionLink}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Définir mon mot de passe
            </a>
          </p>
          <p style="color:#71717a;font-size:13px">Ce lien est valable 24 heures. Si vous n'avez pas demandé ce compte, ignorez cet email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendInvitationEmail:", err);
  }
}

export async function GET() {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const service = createServiceClient();
    const { data: authData, error } = await service.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const { data: orgRowsRaw } = await service
      .from("users_organizations")
      .select("user_id, role, establishment_id, organization_id, organizations(id, name)")
      .eq("deleted", false);

    type OrgRow = {
      user_id: string;
      role: string;
      establishment_id: string | null;
      organization_id: string;
      organizations: { id: string; name: string } | null;
    };
    const orgRows = (orgRowsRaw ?? []) as OrgRow[];

    const orgsByUser = new Map<string, OrgRow[]>();
    for (const row of orgRows) {
      const list = orgsByUser.get(row.user_id) ?? [];
      list.push(row);
      orgsByUser.set(row.user_id, list);
    }

    // Fetch employee data for linked accounts
    const { data: empRowsRaw } = await service
      .from("employees")
      .select("auth_user_id, organization_id, establishment_id, establishments(id, name)")
      .not("auth_user_id", "is", null)
      .eq("deleted", false);

    type EmpRow = {
      auth_user_id: string;
      organization_id: string | null;
      establishment_id: string | null;
      establishments: { id: string; name: string } | null;
    };
    const empRows = (empRowsRaw ?? []) as EmpRow[];
    const empByUserId = new Map<string, EmpRow>();
    for (const row of empRows) {
      if (row.auth_user_id) empByUserId.set(row.auth_user_id, row);
    }

    const users = authData.users.map((u) => {
      const appRole = (u.app_metadata.role as string | undefined) ?? null;
      const userOrgs = orgsByUser.get(u.id) ?? [];
      const orgRole = userOrgs.at(0)?.role ?? null;
      const empRow = empByUserId.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata.full_name as string | undefined) ?? (u.user_metadata.name as string | undefined) ?? "",
        appRole,
        orgRole,
        role: appRole ?? orgRole ?? "unknown",
        organizations: userOrgs.map((o) => ({
          id: o.organization_id,
          name: o.organizations?.name ?? "",
          role: o.role,
          establishmentId: o.establishment_id,
        })),
        employeeEstablishment: empRow?.establishments ?? null,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/admin/users:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}

interface CreateUserBody {
  email: string;
  name: string;
  role: "commercial" | "org_admin" | "manager" | "employee";
  organizationIds: string[];
  establishmentId?: string | null;
  employeeId?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = (await request.json()) as CreateUserBody;
    const { email, name, role, organizationIds, establishmentId, employeeId } = body;

    if (!email) {
      return NextResponse.json({ error: "email requis" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role },
    });
    if (createError) throw createError;

    const userId = created.user.id;

    if (role === "employee") {
      if (employeeId) {
        const { error: linkError } = await service
          .from("employees")
          .update({ auth_user_id: userId, has_mobile_access: true })
          .eq("id", employeeId);
        if (linkError) throw linkError;
      }
    } else if (organizationIds.length > 0) {
      const rows = organizationIds.map((orgId) => ({
        user_id: userId,
        organization_id: orgId,
        role,
        establishment_id: role === "manager" ? (establishmentId ?? null) : null,
      }));
      const { error: insertError } = await service.from("users_organizations").insert(rows);
      if (insertError) throw insertError;
    }

    const { data: linkData } = await service.auth.admin.generateLink({ type: "recovery", email });
    const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    if (actionLink) {
      await sendInvitationEmail(email, name, actionLink);
    }

    return NextResponse.json({ userId });
  } catch (err) {
    console.error("POST /api/admin/users:", err);
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
