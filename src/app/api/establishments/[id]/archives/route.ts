import { NextRequest, NextResponse } from "next/server";

import { checkChains, type ArchiveWithKey } from "@/lib/nf525/archive-chain";
import { businessDayFromClosedAt, inPathWindow, widenWindow } from "@/lib/nf525/archive-period";
import { verifyArchive, type ZArchive } from "@/lib/nf525/archive-verify";
import { establishmentPrefix, getArchive, listArchives } from "@/lib/nf525/s3-read";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Archives fiscales Z d'un établissement, sur une période — CONSULTATION À LA DEMANDE.
 * GET ?organizationId=…&from=YYYY-MM-DD&to=YYYY-MM-DD[&content=1]
 *
 * Renvoie les archives de la période (règle ① = jour de CLÔTURE, cf. archive-period.ts), leur verdict
 * d'intégrité (3 contrôles indissociables) et le rapport de chaînage (par device).
 *
 * Accès : system_admin + org_admin uniquement — comme l'export comptable, ce n'est pas une action
 * déléguable en caisse. Aucun JET n'est émis ici : consulter ≠ archiver.
 */

interface ArchiveRow {
  key: string;
  businessDay: string | null;
  deviceId: string | null;
  createdAt: string | null;
  verdict: ReturnType<typeof verifyArchive>;
}

/** Résout `daily_found_id` → `closed_at` pour appliquer la règle ①. */
async function closedAtByDailyFound(
  svc: ReturnType<typeof createServiceClient>,
  establishmentId: string,
): Promise<Map<string, string | null>> {
  const { data, error } = await svc.from("daily_found").select("id, closed_at").eq("establishment_id", establishmentId);
  if (error) throw new Error(error.message);
  return new Map(data.map((d) => [d.id, d.closed_at]));
}

interface CollectResult {
  rows: ArchiveRow[];
  inPeriod: ArchiveWithKey[];
  contents: Record<string, unknown>;
  missingClosedAt: string[];
}

/**
 * Télécharge les archives pré-filtrées, applique la règle ① (jour de clôture) et vérifie chacune.
 * Extrait de GET pour rester sous la limite de complexité.
 */
async function collectPeriod(
  keys: string[],
  ctx: {
    closedAt: Map<string, string | null>;
    publicKey: string | null;
    from: string;
    to: string;
    withContent: boolean;
  },
): Promise<CollectResult> {
  const out: CollectResult = { rows: [], inPeriod: [], contents: {}, missingClosedAt: [] };
  for (const key of keys) {
    const archive = (await getArchive(key)) as ZArchive;
    const closed = ctx.closedAt.get(archive.daily_found_id ?? "") ?? null;
    // closed_at null = vestige legacy → exception EXPLICITE (jamais en silence), archive exclue.
    if (!closed) {
      out.missingClosedAt.push(key);
      continue;
    }
    const businessDay = businessDayFromClosedAt(closed);
    if (businessDay < ctx.from || businessDay > ctx.to) continue;

    out.rows.push({
      key,
      businessDay,
      deviceId: archive.device_id ?? null,
      createdAt: archive.created_at ?? null,
      verdict: verifyArchive(archive, ctx.publicKey),
    });
    out.inPeriod.push({ key, archive });
    if (ctx.withContent) out.contents[key] = archive;
  }
  out.rows.sort((a, b) => (a.businessDay ?? "").localeCompare(b.businessDay ?? ""));
  return out;
}

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
    const from = sp.get("from");
    const to = sp.get("to");
    const withContent = sp.get("content") === "1";
    if (!organizationId || !from || !to) {
      return NextResponse.json({ error: "organizationId, from et to sont requis" }, { status: 400 });
    }

    const svc = createServiceClient();
    const [closedAt, keyRow] = await Promise.all([
      closedAtByDailyFound(svc, establishmentId),
      svc.from("nf525_signing_keys").select("public_key_base64").eq("establishment_id", establishmentId).maybeSingle(),
    ]);
    const publicKey = keyRow.data?.public_key_base64 ?? null;

    // 1) Lister large (le chemin ne fait pas foi), 2) pré-filtrer sur la fenêtre ±1 j pour ne
    //    télécharger que le plausible, 3) filtrer exactement sur le jour d'exploitation (règle ①).
    const { fromWide, toWide } = widenWindow(from, to);
    const keys = (await listArchives(establishmentPrefix(organizationId, establishmentId)))
      .filter((r) => inPathWindow(r.key, fromWide, toWide))
      .map((r) => r.key);

    const { rows, inPeriod, contents, missingClosedAt } = await collectPeriod(keys, {
      closedAt,
      publicKey,
      from,
      to,
      withContent,
    });

    return NextResponse.json({
      establishmentId,
      period: { from, to },
      count: rows.length,
      archives: rows,
      chain: checkChains(inPeriod),
      missingClosedAt,
      signatureCheckable: publicKey !== null,
      ...(withContent ? { contents } : {}),
    });
  } catch (err) {
    console.error("GET /api/establishments/[id]/archives:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
