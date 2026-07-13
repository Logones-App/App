import { NextRequest, NextResponse } from "next/server";

import { signJet } from "@/lib/nf525/sign-jet";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Body {
  organizationId: string;
  fromDate: string;
  toDate: string;
}

// JET 180 « génération export écritures comptables » — signé CÔTÉ SERVEUR (la signature ECDSA exige
// le service_role/Edge, impossible depuis le navigateur). Le client appelle cette route AVANT le
// download ; en cas d'échec (pas de clé active), on bloque → aucun export non journalisé.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: establishmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin" && role !== "org_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    if (!body.organizationId) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

    const jetErr = await signJet({
      establishmentId,
      organizationId: body.organizationId,
      code: 180,
      label: `Export comptable ${body.fromDate}→${body.toDate}`,
    });
    if (jetErr) {
      return NextResponse.json({ error: `journalisation NF525 (JET 180) impossible — ${jetErr}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
