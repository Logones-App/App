import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface WebhookLeadBody {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  sector?: string;
  website?: string;
  notes?: string;
  source_details?: string;
}

function buildNotificationHtml(body: WebhookLeadBody): string {
  const td = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0"><strong>${label}</strong></td><td>${value}</td></tr>`;
  const rows: string[] = [td("Entreprise", body.company_name)];
  if (body.contact_name) rows.push(td("Contact", body.contact_name));
  if (body.contact_email) rows.push(td("Email", body.contact_email));
  if (body.contact_phone) rows.push(td("Téléphone", body.contact_phone));
  if (body.city) rows.push(td("Ville", body.city));
  if (body.sector) rows.push(td("Secteur", body.sector));
  if (body.source_details) rows.push(td("Source", body.source_details));
  return [
    "<h2>Nouveau lead reçu via webhook</h2>",
    `<table style="font-family:sans-serif;font-size:14px">${rows.join("")}</table>`,
    "<br>",
    '<p style="font-size:12px;color:#888">Lead non assigné — à attribuer dans le CRM</p>',
    '<a href="https://app.logones.fr/fr/admin/leads" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-family:sans-serif">Voir les leads</a>',
  ].join("\n");
}

function buildLeadPayload(body: WebhookLeadBody) {
  return {
    company_name: body.company_name.trim(),
    contact_name: body.contact_name?.trim() ?? null,
    contact_email: body.contact_email?.trim() ?? null,
    contact_phone: body.contact_phone?.trim() ?? null,
    city: body.city?.trim() ?? null,
    sector: body.sector?.trim() ?? null,
    website: body.website?.trim() ?? null,
    notes: body.notes?.trim() ?? null,
    source: "webhook" as const,
    source_details: body.source_details?.trim() ?? null,
    assigned_to: null,
    status: "new" as const,
  };
}

async function notifyTeam(body: WebhookLeadBody, brevoApiKey: string): Promise<void> {
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
    body: JSON.stringify({
      sender: { name: "Logones CRM", email: process.env.EMAIL_FROM ?? "no-reply@logones.fr" },
      to: [{ email: "dev@logones.fr" }],
      subject: `[CRM] Nouveau lead — ${body.company_name}`,
      htmlContent: buildNotificationHtml(body),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("WEBHOOK_SECRET non configuré");
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = (await request.json()) as WebhookLeadBody;

    if (!body.company_name.trim()) {
      return NextResponse.json({ error: "company_name requis" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: lead, error } = await supabase.from("leads").insert(buildLeadPayload(body)).select("id").single();

    if (error) throw error;

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      void notifyTeam(body, brevoApiKey).catch(() => {});
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (err) {
    console.error("POST /api/webhooks/leads error:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
