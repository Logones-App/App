import { NextRequest, NextResponse } from "next/server";

import { verifyArchive, type ArchiveVerdict, type ZArchive } from "@/lib/nf525/archive-verify";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Banc d'essai du vérificateur d'archives — teste un JSON d'archive FOURNI PAR LE CLIENT.
 * POST { archive: <objet> } → le MÊME `verifyArchive` que la consultation de période, rien de spécifique.
 *
 * But : déposer une archive réelle, la modifier localement, et confirmer que les 3 contrôles détectent
 * bien la falsification. La clé publique est résolue depuis l'`establishment_id` PORTÉ PAR l'archive —
 * ainsi, trafiquer cet identifiant fait échouer la signature, ce qui fait partie du test.
 *
 * Accès : system_admin / org_admin, comme la consultation d'archives. La clé publique est publique par
 * nature (remise à l'administration, §6.9.4) ; seul le verdict est renvoyé, jamais la clé.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin" && role !== "org_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = (await req.json()) as { archive?: unknown };
    if (!body.archive || typeof body.archive !== "object") {
      return NextResponse.json({ error: "JSON d'archive manquant ou invalide" }, { status: 400 });
    }
    const archive = body.archive as ZArchive;

    let publicKey: string | null = null;
    if (typeof archive.establishment_id === "string") {
      const svc = createServiceClient();
      const { data } = await svc
        .from("nf525_signing_keys")
        .select("public_key_base64")
        .eq("establishment_id", archive.establishment_id)
        .maybeSingle();
      publicKey = data?.public_key_base64 ?? null;
    }

    const verdict: ArchiveVerdict = verifyArchive(archive, publicKey);
    return NextResponse.json({
      verdict,
      establishmentId: archive.establishment_id ?? null,
      signatureCheckable: publicKey !== null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
