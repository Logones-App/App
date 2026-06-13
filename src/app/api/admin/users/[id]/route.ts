import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function assertSystemAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined;
  return role === "system_admin" ? data.user : null;
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const service = createServiceClient();

  // Soft-delete users_organizations
  await service.from("users_organizations").update({ deleted: true }).eq("user_id", id);

  // Délier la fiche employé si elle existait
  await service.from("employees").update({ auth_user_id: null, has_mobile_access: false }).eq("auth_user_id", id);

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/users/[id]
interface PatchBody {
  role: string;
  organizationId?: string | null;
  establishmentId?: string | null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as PatchBody;
  const { role, organizationId, establishmentId } = body;

  if (!role) return NextResponse.json({ error: "role requis" }, { status: 400 });

  const service = createServiceClient();

  // Si on quitte le rôle employee → délier la fiche employé
  const { data: current } = await service.auth.admin.getUserById(id);
  const previousRole = current.user?.app_metadata.role as string | undefined;
  if (previousRole === "employee" && role !== "employee") {
    await service.from("employees").update({ auth_user_id: null, has_mobile_access: false }).eq("auth_user_id", id);
  }

  // Mettre à jour app_metadata
  const { error: authError } = await service.auth.admin.updateUserById(id, {
    app_metadata: { role },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Mettre à jour users_organizations si une org est fournie
  if (organizationId) {
    const { error: orgError } = await service
      .from("users_organizations")
      .update({ role, establishment_id: establishmentId ?? null })
      .eq("user_id", id)
      .eq("organization_id", organizationId)
      .eq("deleted", false);
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/users/[id] — renvoie l'email de réinitialisation
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await assertSystemAdmin();
  if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: userData, error: fetchError } = await service.auth.admin.getUserById(id);
  if (fetchError || !userData.user.email) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const { error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: userData.user.email,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
