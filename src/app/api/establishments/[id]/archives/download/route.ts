import { NextRequest, NextResponse } from "next/server";

import { establishmentPrefix, getArchiveRaw } from "@/lib/nf525/s3-read";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Téléchargement d'UNE archive Z par sa clé S3 — octets bruts du WORM (donc re-vérifiables).
 * GET ?organizationId=…&key=nf525/{org}/{estab}/{date}/{id}.json
 *
 * Accès : system_admin / org_admin. La clé est contrainte au préfixe de l'établissement de l'URL —
 * impossible de lire l'archive d'un autre établissement en manipulant le paramètre.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const sp = req.nextUrl.searchParams;
    const organizationId = sp.get("organizationId");
    const key = sp.get("key");
    if (!organizationId || !key) {
      return NextResponse.json({ error: "organizationId et key sont requis" }, { status: 400 });
    }
    if (!key.startsWith(establishmentPrefix(organizationId, establishmentId))) {
      return NextResponse.json({ error: "Clé hors du périmètre de l'établissement" }, { status: 403 });
    }

    const raw = await getArchiveRaw(key);
    const filename = key.split("/").pop() ?? "archive.json";
    return new NextResponse(raw, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
