import { NextRequest, NextResponse } from "next/server";

import { signJet } from "@/lib/nf525/sign-jet";
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

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json({ error: "BREVO_API_KEY manquant" }, { status: 500 });
    }

    // JET 290 AVANT l'envoi : traçabilité NF525 obligatoire. signJet signe en ECDSA P-256 via l'Edge
    // Function `nf525-sign`. Sans clé de signature active → erreur → on BLOQUE (aucun email).
    const jetErr = await signJet({
      establishmentId,
      organizationId: body.organizationId,
      code: 290,
      label: `Export ${body.fromDate}→${body.toDate} envoyé à ${body.recipientEmail}`,
    });
    if (jetErr) {
      return NextResponse.json(
        { error: `Envoi bloqué : journalisation NF525 (JET 290) impossible — ${jetErr}` },
        { status: 400 },
      );
    }

    // Envoi email via l'API HTTP Brevo (méthode utilisée par les invitations) + pièce jointe CSV.
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
