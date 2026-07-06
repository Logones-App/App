import { NextRequest, NextResponse } from "next/server";

import { generateTabletPassword } from "@/lib/server/establishment-provisioning";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Svc = ReturnType<typeof createServiceClient>;

async function resolveEstablishmentOrg(svc: Svc, establishmentId: string): Promise<string | null> {
  const { data } = await svc.from("establishments").select("organization_id").eq("id", establishmentId).single();
  return data?.organization_id ?? null;
}

type AuthResult = { ok: false; status: number; error: string } | { ok: true; svc: Svc; orgId: string };

/**
 * Autorisation : `system_admin` (accès total), sinon membre de l'organisation de l'établissement.
 * `requireAdmin` = true restreint aux `org_admin` (pour la réinitialisation du mot de passe).
 */
async function authorize(establishmentId: string, requireAdmin: boolean): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Non authentifié" };

  const svc = createServiceClient();
  const orgId = await resolveEstablishmentOrg(svc, establishmentId);
  if (!orgId) return { ok: false, status: 404, error: "Établissement introuvable" };

  if ((user.app_metadata.role as string | undefined) === "system_admin") return { ok: true, svc, orgId };

  const { data: memberships } = await svc
    .from("users_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .or("deleted.is.null,deleted.eq.false");
  const roles = (memberships ?? []).map((m) => m.role);
  if (roles.length === 0) return { ok: false, status: 403, error: "Accès refusé" };
  if (requireAdmin && !roles.includes("org_admin")) return { ok: false, status: 403, error: "Accès refusé" };

  return { ok: true, svc, orgId };
}

/** Retrouve le compte tablette (orga_user, email `@logones.internal`) rattaché à l'établissement. */
async function findTabletUser(
  svc: Svc,
  orgId: string,
  establishmentId: string,
): Promise<{ userId: string; email: string; password: string | null } | null> {
  const { data: rows } = await svc
    .from("users_organizations")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("establishment_id", establishmentId)
    .or("deleted.is.null,deleted.eq.false");
  for (const r of rows ?? []) {
    const { data } = await svc.auth.admin.getUserById(r.user_id);
    const email = data.user?.email;
    if (email && email.endsWith("@logones.internal")) {
      const meta = data.user?.user_metadata as { tablet_password?: string } | undefined;
      return { userId: r.user_id, email, password: meta?.tablet_password ?? null };
    }
  }
  return null;
}

/** Lire l'identifiant tablette (email seul). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: establishmentId } = await params;
    const auth = await authorize(establishmentId, false);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tablet = await findTabletUser(auth.svc, auth.orgId, establishmentId);
    return NextResponse.json({ email: tablet?.email ?? null, password: tablet?.password ?? null });
  } catch (err) {
    console.error("GET tablet-credentials error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}

/** Réinitialiser le mot de passe tablette et le renvoyer une seule fois. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: establishmentId } = await params;
    const auth = await authorize(establishmentId, true);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tablet = await findTabletUser(auth.svc, auth.orgId, establishmentId);
    if (!tablet) return NextResponse.json({ error: "Compte tablette introuvable" }, { status: 404 });

    const password = generateTabletPassword();
    const { error } = await auth.svc.auth.admin.updateUserById(tablet.userId, {
      password,
      user_metadata: { tablet_password: password },
    });
    if (error) throw error;

    return NextResponse.json({ email: tablet.email, password });
  } catch (err) {
    console.error("POST tablet-credentials error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}
