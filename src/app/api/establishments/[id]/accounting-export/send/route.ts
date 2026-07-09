import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SendBody {
  organizationId: string;
  recipientEmail: string;
  fromDate: string;
  toDate: string;
  filename: string;
  csv: string;
}

type UntypedRpc = (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: establishmentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // Export comptable : réservé à system_admin + org_admin. JAMAIS orga_user (tablette) ni employé
    // (l'export SaaS n'est pas une action déléguable côté caisse). Politique définitive.
    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin" && role !== "org_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = (await req.json()) as SendBody;
    if (!body.recipientEmail || !body.csv || !body.organizationId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Envoi email via l'API HTTP Brevo (méthode utilisée par les invitations) + pièce jointe CSV.
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json({ error: "BREVO_API_KEY manquant" }, { status: 500 });
    }
    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "Logones", email: process.env.EMAIL_FROM ?? "no-reply@logones.fr" },
        to: [{ email: body.recipientEmail }],
        subject: `Export comptable ${body.fromDate} → ${body.toDate}`,
        htmlContent: `<p>Bonjour,</p><p>Veuillez trouver ci-joint l'export comptable (ventilation TVA) pour la période du ${body.fromDate} au ${body.toDate}.</p><p>Cordialement.</p>`,
        attachment: [{ name: body.filename, content: Buffer.from(body.csv, "utf-8").toString("base64") }],
      }),
    });
    if (!emailRes.ok) {
      const detail = await emailRes.text();
      return NextResponse.json({ error: `Échec envoi email : ${detail}` }, { status: 502 });
    }

    // JET 290 — envoi de l'export à l'expert-comptable (traçabilité).
    const { error: jetErr } = await (supabase.rpc as unknown as UntypedRpc)("nf525_jet_290_saas", {
      p_establishment_id: establishmentId,
      p_organization_id: body.organizationId,
      p_label: `Export ${body.fromDate}→${body.toDate} envoyé à ${body.recipientEmail}`,
    });
    if (jetErr) {
      return NextResponse.json({ error: `Email envoyé mais JET 290 non créé : ${jetErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
