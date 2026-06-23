import { NextRequest, NextResponse } from "next/server";

import { generateSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

function generateSecurePassword(): string {
  return (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 24);
}

async function generateEstablishmentSlug(svc: Svc, name: string): Promise<string> {
  const base = generateSlug(name);
  const candidates = [base, ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 1}`)];
  const { data } = await svc.from("establishments").select("slug").in("slug", candidates);
  const taken = new Set((data ?? []).map((r) => r.slug).filter(Boolean));
  return candidates.find((c) => !taken.has(c)) ?? `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createOrgaUser(
  svc: Svc,
  establishmentId: string,
  organizationId: string,
  slug: string,
): Promise<{ email: string; password: string }> {
  const email = `${slug}@logones.internal`;
  const password = generateSecurePassword();

  const { data: newUser, error: authError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "orga_user" },
  });
  if (authError) throw authError;
  const userId = newUser.user.id;

  const { error: uoError } = await svc.from("users_organizations").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "manager",
    establishment_id: establishmentId,
  });

  if (uoError) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw uoError;
  }

  return { email, password };
}

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

interface VatBody {
  name: string;
  value: number;
}

function buildEstData(est: EstBody, orgId: string, userId: string, slug: string) {
  const rawPostal = est.postal_code ? parseInt(est.postal_code, 10) : null;
  return {
    name: est.name.trim(),
    organization_id: orgId,
    created_by: userId,
    slug,
    address: est.address ?? null,
    postal_code: rawPostal !== null && !isNaN(rawPostal) ? rawPostal : null,
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

function generateSigningKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

async function insertNf525Key(svc: Svc, estId: string, orgId: string): Promise<void> {
  const { error } = await svc.from("nf525_signing_keys").insert({
    establishment_id: estId,
    organization_id: orgId,
    signing_key_base64: generateSigningKey(),
  });
  if (error) throw error;
}

async function insertVatRates(svc: Svc, rates: VatBody[], estId: string, orgId: string): Promise<void> {
  const filtered = rates.filter((r) => r.value > 0);
  if (filtered.length === 0) return;
  const rows = filtered.map((r) => ({
    establishment_id: estId,
    organization_id: orgId,
    name: r.name,
    value: r.value,
  }));
  const { error } = await svc.from("vat_rate").insert(rows);
  if (error) throw error;
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
    const body = (await req.json()) as { establishment?: EstBody; vat_rates?: VatBody[] };

    if (!body.establishment?.name.trim()) {
      return NextResponse.json({ error: "Nom de l'établissement requis" }, { status: 400 });
    }

    const svc = createServiceClient();

    const { data: org } = await svc.from("organizations").select("id").eq("id", orgId).single();
    if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });

    const slug = await generateEstablishmentSlug(svc, body.establishment.name.trim());
    const estData = buildEstData(body.establishment, orgId, user.id, slug);

    const { data: newEst, error: estError } = await svc.from("establishments").insert(estData).select("id").single();

    if (estError) throw estError;

    await insertNf525Key(svc, newEst.id, orgId);
    await insertVatRates(svc, body.vat_rates ?? [], newEst.id, orgId);

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
