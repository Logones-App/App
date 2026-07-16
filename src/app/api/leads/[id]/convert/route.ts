import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_ORG_VAT_RATES,
  createOrgaUser,
  ensureOrgVatRates,
  generateEstablishmentSlug,
  seedEstablishmentDefaults,
} from "@/lib/server/establishment-provisioning";
import { INVITATION_REDIRECT_URL, sendInvitationEmail } from "@/lib/services/invitation-email";
import { generateSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

class ValidationError extends Error {}

interface OrgPayload {
  name: string;
  description?: string | null;
  subscription_plan?: string | null;
}
interface EstPayload {
  name: string;
  address?: string | null;
  /** CHAÎNE, jamais un nombre : « 01000 » perdrait son zéro initial (départements 01 à 09). */
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  siret?: string | null;
  no_tva?: string | null;
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
  // Taux de TVA standard seedés au niveau ORG (idempotent, non bloquant).
  try {
    await ensureOrgVatRates(svc, data.id, DEFAULT_ORG_VAT_RATES);
  } catch (vatErr) {
    console.error("Seed TVA org échoué (non bloquant):", vatErr);
  }
  // Pool de modules par défaut (POS) pour que l'établissement puisse appairer une caisse.
  // Le reste des modules s'active ensuite dans la page d'attribution. Best-effort.
  const { error: modErr } = await svc
    .from("organization_modules")
    .insert({ organization_id: data.id, module: "pos", enabled: true, seats: 2 });
  if (modErr) console.error("Seed module POS org (conversion lead) échoué (non bloquant):", modErr);
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
    // Clé NF525 = prérequis obligatoire : rollback de l'établissement si le provisioning échoue.
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
