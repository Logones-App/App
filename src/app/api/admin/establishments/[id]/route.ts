import { NextRequest, NextResponse } from "next/server";

import { signJet } from "@/lib/nf525/sign-jet";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface PatchBody {
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  siret: string | null;
  no_tva: string | null;
  code_naf: string | null;
  description: string | null;
}

/** Chaîne vide → null. `??` ne conviendrait pas : `""` n'est pas nullish et serait conservé tel quel. */
function trimOrNull(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t === undefined || t === "" ? null : t;
}

function buildPatch(body: PatchBody) {
  return {
    name: body.name.trim(),
    address: body.address ?? null,
    // ⚠️ JAMAIS de parseInt : un code postal est une CHAÎNE. « 01000 » (Bourg-en-Bresse) deviendrait 1000
    // — départements 01 à 09. Restitué sur la pièce (R12, SOC-CCP) et présent dans l'archive fiscale, donc
    // un zéro perdu est une non-conformité NF525. Colonne passée en `text` le 16/07/2026.
    postal_code: trimOrNull(body.postal_code),
    city: body.city ?? null,
    country: body.country ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: body.website ?? null,
    siret: body.siret ?? null,
    no_tva: body.no_tva ?? null,
    code_naf: body.code_naf ?? null,
    description: body.description ?? null,
  };
}

// Champs "assujetti" NF525 : tout changement déclenche un JET 410. Modifiables uniquement via cette
// route (service_role) — un REVOKE UPDATE au niveau colonne interdit aux rôles client de les toucher.
const SENSITIVE = ["name", "address", "city", "postal_code", "country", "siret", "no_tva", "code_naf"] as const;

function changedSensitive(
  current: Record<(typeof SENSITIVE)[number], string | number | null>,
  patch: ReturnType<typeof buildPatch>,
): string[] {
  return SENSITIVE.filter((f) => String(current[f] ?? "") !== String(patch[f] ?? ""));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = (await req.json()) as PatchBody;
    if (!body.name.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

    // Écriture des champs assujetti via service_role (les rôles client sont REVOKE sur ces colonnes).
    const svc = createServiceClient();
    const { data: current } = await svc
      .from("establishments")
      .select("organization_id, name, address, city, postal_code, country, siret, no_tva, code_naf")
      .eq("id", id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 });

    const patch = buildPatch(body);
    const changed = changedSensitive(current, patch);

    const { error } = await svc.from("establishments").update(patch).eq("id", id);
    if (error) throw error;

    // JET 410 « changement données assujetti » signé côté app/Edge (le trigger DB a été retiré :
    // il signait en HMAC, incompatible ECDSA). Route selon l'algo de l'établissement.
    if (changed.length > 0 && current.organization_id) {
      const jetErr = await signJet({
        establishmentId: id,
        organizationId: current.organization_id,
        code: 410,
        label: changed.join(", "),
      });
      if (jetErr) {
        return NextResponse.json({ error: `Mise à jour effectuée mais JET 410 non créé : ${jetErr}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/establishments/[id] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
