import { NextRequest, NextResponse } from "next/server";

import {
  createOrgaUser,
  generateEstablishmentSlug,
  seedEstablishmentDefaults,
} from "@/lib/server/establishment-provisioning";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidNaf } from "@/lib/utils/naf";

export const dynamic = "force-dynamic";

interface EstBody {
  name: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  siret?: string | null;
  no_tva?: string | null;
  code_naf?: string | null;
}

/** Chaîne vide → null. `??` ne conviendrait pas : `""` n'est pas nullish et serait conservé tel quel. */
function trimOrNull(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t === undefined || t === "" ? null : t;
}

function buildEstData(est: EstBody, orgId: string, userId: string, slug: string) {
  return {
    name: est.name.trim(),
    organization_id: orgId,
    created_by: userId,
    slug,
    address: est.address ?? null,
    // ⚠️ JAMAIS de parseInt ici : un code postal est une CHAÎNE. « 01000 » (Bourg-en-Bresse) deviendrait
    // 1000 — départements 01 à 09. Il est restitué sur la pièce (R12, SOC-CCP) et figure dans l'archive
    // fiscale, donc un zéro perdu est une non-conformité NF525. La colonne est en `text` depuis le 16/07/2026.
    postal_code: trimOrNull(est.postal_code),
    city: est.city ?? null,
    country: est.country ?? "FR",
    phone: est.phone ?? null,
    email: est.email ?? null,
    website: est.website ?? null,
    siret: est.siret ?? null,
    no_tva: est.no_tva ?? null,
    code_naf: est.code_naf ?? null,
  };
}

/**
 * Provisionne les seeds (clé NF525 en 1er, throw si échec) ; si le provisioning échoue, ROLLBACK
 * la ligne établissement → « établissement existe ⟺ clé NF525 existe » (prérequis obligatoire).
 */
async function provisionOrRollback(
  svc: ReturnType<typeof createServiceClient>,
  estId: string,
  orgId: string,
): Promise<void> {
  try {
    await seedEstablishmentDefaults(svc, estId, orgId);
  } catch (seedErr) {
    try {
      await svc.from("establishments").delete().eq("id", estId);
    } catch (rollbackErr) {
      console.error("Rollback établissement (provisioning échoué) impossible:", rollbackErr);
    }
    throw seedErr;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: orgId } = await params;
    const body = (await req.json()) as { establishment?: EstBody };

    if (!body.establishment?.name.trim()) {
      return NextResponse.json({ error: "Nom de l'établissement requis" }, { status: 400 });
    }
    if (!body.establishment.siret?.trim()) {
      return NextResponse.json({ error: "SIRET requis (NF525)" }, { status: 400 });
    }
    if (!body.establishment.no_tva?.trim()) {
      return NextResponse.json({ error: "N° TVA requis (NF525)" }, { status: 400 });
    }
    if (!body.establishment.code_naf?.trim() || !isValidNaf(body.establishment.code_naf)) {
      return NextResponse.json({ error: "Code NAF requis et valide (NF525)" }, { status: 400 });
    }

    const svc = createServiceClient();

    const { data: org } = await svc.from("organizations").select("id").eq("id", orgId).single();
    if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });

    const slug = await generateEstablishmentSlug(svc, body.establishment.name.trim());
    const estData = buildEstData(body.establishment, orgId, user.id, slug);

    const { data: newEst, error: estError } = await svc.from("establishments").insert(estData).select("id").single();

    if (estError) throw estError;

    await provisionOrRollback(svc, newEst.id, orgId);

    let tabletCredentials: { email: string; password: string } | null = null;
    let tabletError: string | null = null;
    try {
      tabletCredentials = await createOrgaUser(svc, newEst.id, orgId, slug);
    } catch (err) {
      tabletError = err instanceof Error ? err.message : "Erreur création compte tablette";
      console.error("createOrgaUser failed:", err);
    }

    return NextResponse.json({ estId: newEst.id, tabletCredentials, tabletError }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/organizations/[id]/establishments error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
