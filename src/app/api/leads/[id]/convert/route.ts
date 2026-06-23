import { NextRequest, NextResponse } from "next/server";

import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
import { generateSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

class ValidationError extends Error {}

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
      slug: `${generateSlug(org.name)}-${Math.random().toString(36).slice(2, 7)}`,
      description: org.description ?? null,
      subscription_plan: org.subscription_plan ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createEstablishment(
  svc: Svc,
  est: EstPayload,
  orgId: string,
  userId: string,
): Promise<{ id: string; slug: string }> {
  const slug = await generateEstablishmentSlug(svc, est.name);
  const { data, error } = await svc
    .from("establishments")
    .insert({
      name: est.name,
      organization_id: orgId,
      created_by: userId,
      slug,
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
  return { id: data.id, slug };
}

function generateSigningKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

async function createNf525Key(svc: Svc, estId: string, orgId: string): Promise<void> {
  const { error } = await svc.from("nf525_signing_keys").insert({
    establishment_id: estId,
    organization_id: orgId,
    signing_key_base64: generateSigningKey(),
  });
  if (error) throw error;
}

async function createVatRates(svc: Svc, rates: VatPayload[], estId: string, orgId: string): Promise<void> {
  if (rates.length === 0) return;
  const rows = rates.map((r) => ({ establishment_id: estId, organization_id: orgId, name: r.name, value: r.value }));
  const { error } = await svc.from("vat_rate").insert(rows);
  if (error) throw error;
}

async function createOrgaUser(
  svc: Svc,
  establishmentId: string,
  organizationId: string,
  slug: string,
): Promise<{ email: string; password: string }> {
  const email = `${slug}@logones.internal`;
  const password = generateSecurePassword();
  let userId: string | null = null;

  const { data: newUser, error: authError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "orga_user" },
  });
  if (authError) throw authError;
  userId = newUser.user.id;

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

async function createOrgAdmin(svc: Svc, email: string, name: string, orgId: string): Promise<void> {
  const { data: created, error } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { role: "org_admin" },
  });
  if (error) throw error;

  const userId = created.user.id;
  const { error: uoError } = await svc.from("users_organizations").insert({
    user_id: userId,
    organization_id: orgId,
    role: "org_admin",
  });
  if (uoError) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw uoError;
  }

  const { data: linkData } = await svc.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: INVITATION_REDIRECT_URL },
  });
  const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (actionLink) await sendInvitationEmail(email, name, actionLink);
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

async function resolveOrg(
  svc: Svc,
  body: ConvertBody,
  userId: string,
): Promise<{
  orgId: string;
  tabletCredentials: { email: string; password: string } | null;
  tabletError: string | null;
}> {
  if (body.mode === "existing") {
    if (!body.org_id) throw new ValidationError("org_id requis");
    return { orgId: body.org_id, tabletCredentials: null, tabletError: null };
  }
  if (!body.org?.name) throw new ValidationError("org.name requis");
  const orgId = await createOrg(svc, body.org);
  let tabletCredentials: { email: string; password: string } | null = null;
  let tabletError: string | null = null;
  if (body.establishment?.name) {
    const { id: estId, slug } = await createEstablishment(svc, body.establishment, orgId, userId);
    await createNf525Key(svc, estId, orgId);
    await createVatRates(svc, body.vat_rates ?? [], estId, orgId);
    try {
      tabletCredentials = await createOrgaUser(svc, estId, orgId, slug);
    } catch (err) {
      tabletError = err instanceof Error ? err.message : "Erreur création compte tablette";
      console.error("Orga user creation failed:", err);
    }
  }
  return { orgId, tabletCredentials, tabletError };
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

    const { data: lead, error: leadErr } = await svc
      .from("leads")
      .select("assigned_to, contact_email, contact_name")
      .eq("id", leadId)
      .single();
    if (leadErr ?? !lead) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });

    const { orgId, tabletCredentials, tabletError } = await resolveOrg(svc, body, user.id);

    if (body.mode === "new") {
      const typedLead = lead as {
        assigned_to: string | null;
        contact_email?: string | null;
        contact_name?: string | null;
      };
      if (typedLead.contact_email) {
        try {
          await createOrgAdmin(svc, typedLead.contact_email, typedLead.contact_name ?? "", orgId);
        } catch (err) {
          console.error("createOrgAdmin failed in convert:", err);
        }
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

    return NextResponse.json({ ok: true, orgId, tabletCredentials, tabletError });
  } catch (err) {
    console.error("POST /api/leads/[id]/convert error:", err);
    const status = err instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status });
  }
}
