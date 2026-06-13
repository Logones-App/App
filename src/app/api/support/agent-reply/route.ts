import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface ConversationMessage {
  role: string;
  content: string;
}

interface AgentReplyBody {
  ticketId: string;
  content: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  conversationHistory: ConversationMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentReplyBody;
    const { ticketId, content, customerEmail, customerName, subject, conversationHistory } = body;

    const supabase = createServiceClient();

    const { data: message, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticketId, content, role: "agent", is_ai_generated: false })
      .select()
      .single();

    if (error) throw error;

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      const historyHtml = conversationHistory
        .map((m) => {
          const label = m.role === "user" ? customerName : m.role === "agent" ? "Support Logones" : "Assistant IA";
          return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px">
            <strong style="color:#333">${label}</strong><br>
            <span style="color:#555;white-space:pre-wrap">${m.content}</span>
          </td></tr>`;
        })
        .join("");

      void fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
        body: JSON.stringify({
          sender: { name: "Support Logones", email: "support@logones.fr" },
          to: [{ email: customerEmail, name: customerName }],
          replyTo: { email: "support@logones.fr", name: "Support Logones" },
          subject: `Re: [Support] ${subject}`,
          htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#000;padding:16px 24px">
              <h2 style="color:#fff;margin:0;font-size:18px">Logones Support</h2>
            </div>
            <div style="padding:24px">
              <p style="margin:0 0 16px">Bonjour ${customerName},</p>
              <div style="background:#f5f5f5;border-left:3px solid #000;padding:12px 16px;margin:0 0 16px;white-space:pre-wrap;font-size:14px">${content}</div>
              ${
                historyHtml
                  ? `<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
              <p style="color:#999;font-size:12px;margin:0 0 8px">Historique de la conversation :</p>
              <table style="width:100%">${historyHtml}</table>`
                  : ""
              }
            </div>
            <div style="background:#f5f5f5;padding:12px 24px;font-size:12px;color:#999">
              Logones — Gestion de restaurant et réservations
            </div>
          </div>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
