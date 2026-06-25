import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

function buildPatch(body: PatchBody) {
  const rawPostal = body.postal_code ? parseInt(body.postal_code, 10) : null;
  return {
    name: body.name.trim(),
    address: body.address ?? null,
    postal_code: rawPostal !== null && !isNaN(rawPostal) ? rawPostal : null,
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

const NF525_SENSITIVE_FIELDS = [
  "name",
  "address",
  "city",
  "postal_code",
  "country",
  "siret",
  "no_tva",
  "code_naf",
] as const;

type SensitiveField = (typeof NF525_SENSITIVE_FIELDS)[number];
type PatchResult = ReturnType<typeof buildPatch>;

function detectChangedFields(
  current: Record<SensitiveField, string | number | null>,
  patch: PatchResult,
): SensitiveField[] {
  return NF525_SENSITIVE_FIELDS.filter((f) => String(current[f] ?? "") !== String(patch[f] ?? ""));
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

    if (!body.name.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    // Lire les valeurs actuelles pour détecter les champs NF525 modifiés
    const { data: current, error: fetchErr } = await supabase
      .from("establishments")
      .select("organization_id, name, address, city, postal_code, country, siret, no_tva, code_naf")
      .eq("id", id)
      .single();

    if (fetchErr ?? !current) {
      return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 });
    }

    const patch = buildPatch(body);
    const changedFields = detectChangedFields(current as Record<SensitiveField, string | number | null>, patch);

    const { error } = await supabase.from("establishments").update(patch).eq("id", id);
    if (error) throw error;

    // JET 410 si au moins un champ sensible NF525 a changé
    if (changedFields.length > 0 && current.organization_id) {
      type UntypedRpc = (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      const { error: jetErr } = await (supabase.rpc as unknown as UntypedRpc)("nf525_jet_410_saas", {
        p_establishment_id: id,
        p_organization_id: current.organization_id,
        p_changed_fields: changedFields.join(", "),
      });
      if (jetErr) {
        console.error("[NF525] JET 410 failed:", jetErr);
        return NextResponse.json(
          { error: `Mise à jour effectuée mais JET 410 non créé : ${jetErr.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/establishments/[id] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
