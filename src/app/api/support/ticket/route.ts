import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface ConversationMessage {
  role: string;
  content: string;
}

interface CreateTicketBody {
  customerName: string;
  customerEmail: string;
  subject: string;
  organizationId?: string;
  establishmentId?: string;
  conversationHistory?: ConversationMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTicketBody;
    const { customerName, customerEmail, subject, organizationId, establishmentId, conversationHistory } = body;

    const supabase = createServiceClient();

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        subject,
        organization_id: organizationId ?? null,
        establishment_id: establishmentId ?? null,
        ai_handled: false,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    if (conversationHistory && conversationHistory.length > 0) {
      const messages = conversationHistory.map((m) => ({
        ticket_id: ticket.id,
        content: m.content,
        role: m.role,
        is_ai_generated: m.role === "assistant",
      }));
      await supabase.from("support_messages").insert(messages);
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      void fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
        body: JSON.stringify({
          sender: { name: "Logones Support", email: "no-reply@logones.fr" },
          to: [{ email: "dev@logones.fr" }],
          subject: `[Support] Nouveau ticket — ${subject}`,
          htmlContent: `<h2>Nouveau ticket de support</h2><table style="font-family:sans-serif;font-size:14px;"><tr><td style="padding:4px 12px 4px 0"><strong>Client</strong></td><td>${customerName}</td></tr><tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${customerEmail}</td></tr><tr><td style="padding:4px 12px 4px 0"><strong>Sujet</strong></td><td>${subject}</td></tr><tr><td style="padding:4px 12px 4px 0"><strong>ID</strong></td><td>${ticket.id}</td></tr></table><br><a href="https://app.logones.fr/fr/admin/support" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Voir le ticket</a>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ticketId: ticket.id });
  } catch {
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
