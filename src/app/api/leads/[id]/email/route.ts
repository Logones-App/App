import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface EmailBody {
  to: string;
  subject: string;
  content: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const body = (await request.json()) as EmailBody;
    const { to, subject, content } = body;

    if (!to || !subject || !content) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Vérifier l'authentification et les permissions
    const supabaseUser = createClient();
    const {
      data: { user },
    } = await (await supabaseUser).auth.getUser();

    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (!role || !["system_admin", "commercial", "account_manager"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Envoyer via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    let brevoMessageId: string | null = null;

    if (brevoApiKey) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
        body: JSON.stringify({
          sender: { name: "Logones", email: process.env.EMAIL_FROM ?? "no-reply@logones.fr" },
          to: [{ email: to }],
          subject,
          htmlContent: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${content.replace(/\n/g, "<br>")}</div>`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Brevo error:", res.status, errText);
        return NextResponse.json({ error: "Échec envoi email" }, { status: 502 });
      }

      const resData = (await res.json()) as { messageId?: string };
      brevoMessageId = resData.messageId ?? null;
    }

    // Logger l'activité
    const supabase = createServiceClient();
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "email",
      email_to: to,
      email_subject: subject,
      content,
      brevo_message_id: brevoMessageId,
      created_by: user.id,
    });

    return NextResponse.json({ ok: true, brevoMessageId });
  } catch (err) {
    console.error("POST /api/leads/[id]/email error:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
