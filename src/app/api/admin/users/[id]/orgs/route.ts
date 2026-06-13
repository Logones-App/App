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

interface OrgAssignBody {
  organizationId: string;
  role: "commercial" | "org_admin" | "manager";
  establishmentId?: string | null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: userId } = await params;
    const body = (await request.json()) as OrgAssignBody;
    const { organizationId, role, establishmentId } = body;

    const service = createServiceClient();

    // org_admin et manager ne peuvent appartenir qu'à une seule organisation
    if (role === "org_admin" || role === "manager") {
      const { count } = await service
        .from("users_organizations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("deleted", false);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: "Un org_admin ou manager ne peut appartenir qu'à une seule organisation." },
          { status: 400 },
        );
      }
    }

    const { error } = await service.from("users_organizations").insert({
      user_id: userId,
      organization_id: organizationId,
      role,
      establishment_id: establishmentId ?? null,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("orgId");
    if (!organizationId) return NextResponse.json({ error: "orgId requis" }, { status: 400 });

    const service = createServiceClient();
    const { error } = await service
      .from("users_organizations")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
