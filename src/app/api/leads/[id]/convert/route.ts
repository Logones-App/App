import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

interface OrgPayload {
  name: string;
  description?: string | null;
  subscription_plan?: string | null;
}
interface EstPayload {
  name: string;
  address?: string | null;
  postal_code?: number | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  siret?: string | null;
  no_tva?: string | null;
}
interface VatPayload {
  name: string;
  value: number;
}

async function createOrg(svc: Svc, org: OrgPayload): Promise<string> {
  const { data, error } = await svc
    .from("organizations")
    .insert({
      name: org.name,
      slug: generateSlug(org.name),
      description: org.description ?? null,
      subscription_plan: org.subscription_plan ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createEstablishment(svc: Svc, est: EstPayload, orgId: string, userId: string): Promise<string> {
  const { data, error } = await svc
    .from("establishments")
    .insert({
      name: est.name,
      organization_id: orgId,
      created_by: userId,
      address: est.address ?? null,
      postal_code: est.postal_code ?? null,
      city: est.city ?? null,
      phone: est.phone ?? null,
      email: est.email ?? null,
      website: est.website ?? null,
      siret: est.siret ?? null,
      no_tva: est.no_tva ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createVatRates(svc: Svc, rates: VatPayload[], estId: string, orgId: string): Promise<void> {
  if (rates.length === 0) return;
  const rows = rates.map((r) => ({ establishment_id: estId, organization_id: orgId, name: r.name, value: r.value }));
  const { error } = await svc.from("vat_rate").insert(rows);
  if (error) throw error;
}

async function assignCommercial(svc: Svc, userId: string, orgId: string, role: string): Promise<void> {
  const { data: existing } = await svc
    .from("users_organizations")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .eq("deleted", false)
    .maybeSingle();
  if (existing) return;
  await svc.from("users_organizations").insert({ user_id: userId, organization_id: orgId, role });
}

interface ConvertBody {
  mode: "new" | "existing";
  org_id?: string;
  org?: OrgPayload;
  establishment?: EstPayload;
  vat_rates?: VatPayload[];
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const callerRole = (user.app_metadata.role ?? user.user_metadata.role) as string | undefined;
    if (!callerRole || !["system_admin", "commercial", "account_manager"].includes(callerRole)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id: leadId } = await params;
    const body = (await request.json()) as ConvertBody;
    const svc = createServiceClient();

    const { data: lead, error: leadErr } = await svc.from("leads").select("assigned_to").eq("id", leadId).single();
    if (leadErr ?? !lead) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });

    let orgId: string;

    if (body.mode === "existing") {
      if (!body.org_id) return NextResponse.json({ error: "org_id requis" }, { status: 400 });
      orgId = body.org_id;
    } else {
      if (!body.org?.name) return NextResponse.json({ error: "org.name requis" }, { status: 400 });
      orgId = await createOrg(svc, body.org);
      if (body.establishment?.name) {
        const estId = await createEstablishment(svc, body.establishment, orgId, user.id);
        await createVatRates(svc, body.vat_rates ?? [], estId, orgId);
      }
    }

    await svc
      .from("leads")
      .update({
        status: "won",
        converted_org_id: orgId,
        converted_at: new Date().toISOString(),
        stage_changed_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    const assignedTo = (lead as { assigned_to: string | null }).assigned_to;
    if (assignedTo) await assignCommercial(svc, assignedTo, orgId, callerRole);

    await svc.from("lead_activities").insert({
      lead_id: leadId,
      type: "note",
      title: "Lead converti en organisation",
      content: body.mode === "new" ? (body.org?.name ?? "") : "Organisation existante liée",
      created_by: user.id,
    });

    return NextResponse.json({ ok: true, orgId });
  } catch (err) {
    console.error("POST /api/leads/[id]/convert error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
