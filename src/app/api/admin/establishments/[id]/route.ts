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

    const { error } = await supabase.from("establishments").update(buildPatch(body)).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/establishments/[id] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
