import { NextRequest, NextResponse } from "next/server";

import { businessDayFromClosedAt, inPathWindow, widenWindow } from "@/lib/nf525/archive-period";
import { establishmentPrefix, getArchiveRaw, listArchives } from "@/lib/nf525/s3-read";
import { createZip, type ZipEntry } from "@/lib/nf525/zip";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Téléchargement ZIP de TOUTES les archives Z d'une période — octets bruts du WORM, une entrée par archive.
 * GET ?organizationId=…&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Même règle de période que la consultation (jour de CLÔTURE, cf. archive-period.ts). Chaque archive garde
 * ses octets exacts → le ZIP décompressé reste vérifiable (banc d'essai, golden). Aucun JET émis.
 * Accès : system_admin / org_admin.
 */

async function closedAtByDailyFound(
  svc: ReturnType<typeof createServiceClient>,
  establishmentId: string,
): Promise<Map<string, string | null>> {
  const { data, error } = await svc.from("daily_found").select("id, closed_at").eq("establishment_id", establishmentId);
  if (error) throw new Error(error.message);
  return new Map(data.map((d) => [d.id, d.closed_at]));
}

interface Ctx {
  closedAt: Map<string, string | null>;
  from: string;
  to: string;
}

/** Télécharge les clés pré-filtrées, applique la règle ①, retourne les entrées ZIP en période. */
async function collectEntries(keys: string[], ctx: Ctx): Promise<{ entries: ZipEntry[]; skipped: number }> {
  const entries: ZipEntry[] = [];
  let skipped = 0;
  for (const key of keys) {
    const raw = await getArchiveRaw(key);
    const parsed = JSON.parse(raw) as { daily_found_id?: string };
    const closed = ctx.closedAt.get(parsed.daily_found_id ?? "") ?? null;
    if (!closed) {
      skipped++;
      continue;
    }
    const businessDay = businessDayFromClosedAt(closed);
    if (businessDay < ctx.from || businessDay > ctx.to) continue;
    const fileName = key.split("/").pop() ?? "archive.json";
    entries.push({ name: `${businessDay}_${fileName}`, data: Buffer.from(raw, "utf8") });
  }
  return { entries, skipped };
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
    if (!organizationId || !from || !to) {
      return NextResponse.json({ error: "organizationId, from et to sont requis" }, { status: 400 });
    }

    const svc = createServiceClient();
    const closedAt = await closedAtByDailyFound(svc, establishmentId);

    const { fromWide, toWide } = widenWindow(from, to);
    const keys = (await listArchives(establishmentPrefix(organizationId, establishmentId)))
      .filter((r) => inPathWindow(r.key, fromWide, toWide))
      .map((r) => r.key);

    const { entries } = await collectEntries(keys, { closedAt, from, to });
    if (entries.length === 0) {
      return NextResponse.json({ error: "Aucune archive sur la période" }, { status: 404 });
    }

    const zip = createZip(entries, new Date());
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="archives-fiscales_${from}_${to}.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
