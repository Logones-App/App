import { NextRequest, NextResponse } from "next/server";

import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: employeeId } = await params;
    const svc = createServiceClient();

    const { data: emp, error: empErr } = await svc
      .from("employees")
      .select("id, firstname, lastname, email, auth_user_id, organization_id")
      .eq("id", employeeId)
      .eq("deleted", false)
      .single();

    if (empErr ?? !emp) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    if (emp.auth_user_id)
      return NextResponse.json({ error: "Un compte existe déjà pour cet employé" }, { status: 409 });
    if (!emp.email) return NextResponse.json({ error: "L'employé n'a pas d'email" }, { status: 400 });

    const { data: created, error: createError } = await svc.auth.admin.createUser({
      email: emp.email,
      email_confirm: true,
      user_metadata: { full_name: `${emp.firstname} ${emp.lastname}` },
      app_metadata: { role: "employee" },
    });
    if (createError) throw createError;

    const userId = created.user.id;
    const { error: linkError } = await svc
      .from("employees")
      .update({ auth_user_id: userId, has_mobile_access: true })
      .eq("id", employeeId);

    if (linkError) {
      await svc.auth.admin.deleteUser(userId).catch(() => {});
      throw linkError;
    }

    const { data: linkData } = await svc.auth.admin.generateLink({
      type: "recovery",
      email: emp.email,
      options: { redirectTo: INVITATION_REDIRECT_URL },
    });
    const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;

    let emailSent = false;
    if (actionLink) {
      emailSent = await sendInvitationEmail(emp.email, `${emp.firstname} ${emp.lastname}`, actionLink);
    }

    return NextResponse.json({ userId, emailSent });
  } catch (err) {
    console.error("POST /api/admin/employees/[id]/invite error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
