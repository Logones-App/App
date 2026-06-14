import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function sendAssignmentEmail(
  commercialEmail: string,
  commercialName: string,
  leadCompany: string,
  brevoApiKey: string,
) {
  const senderName = "Logones";
  const senderEmail = process.env.EMAIL_FROM ?? "no-reply@logones.fr";
  const displayName = commercialName || commercialEmail;
  const html = [
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">`,
    `<p>Bonjour ${displayName},</p>`,
    `<p>Un nouveau lead vous a été assigné : <strong>${leadCompany}</strong>.</p>`,
    `<p>Connectez-vous à votre espace commercial pour consulter les détails et prendre contact.</p>`,
    `<p style="margin-top:24px;color:#6b7280;font-size:12px">Logones — Gestion commerciale</p>`,
    `</div>`,
  ].join("");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: commercialEmail, name: displayName }],
      subject: `Nouveau lead assigné : ${leadCompany}`,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Brevo assign email error:", res.status, errText);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: leadId } = await params;
    const body = (await request.json()) as { commercial_id: string };
    const { commercial_id } = body;
    if (!commercial_id) return NextResponse.json({ error: "commercial_id requis" }, { status: 400 });

    const svc = createServiceClient();

    const [{ data: lead, error: leadErr }, { data: commercialUser, error: userErr }] = await Promise.all([
      svc.from("leads").select("company_name, assigned_to").eq("id", leadId).single(),
      svc.auth.admin.getUserById(commercial_id),
    ]);

    if (leadErr ?? !lead) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
    if (userErr ?? !commercialUser) return NextResponse.json({ error: "Commercial introuvable" }, { status: 404 });

    const { error: updateErr } = await svc.from("leads").update({ assigned_to: commercial_id }).eq("id", leadId);
    if (updateErr) throw updateErr;

    const commercialEmail = commercialUser.user.email ?? "";
    const commercialName =
      (commercialUser.user.user_metadata.full_name as string | null) ??
      (commercialUser.user.user_metadata.name as string | null) ??
      "";

    await svc.from("lead_activities").insert({
      lead_id: leadId,
      type: "note",
      title: "Lead assigné",
      content: `Assigné à ${commercialName || commercialEmail}`,
      created_by: user.id,
    });

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey && commercialEmail) {
      void sendAssignmentEmail(
        commercialEmail,
        commercialName,
        (lead as { company_name: string }).company_name,
        brevoApiKey,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/leads/[id]/assign error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
