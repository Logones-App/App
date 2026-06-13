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

export async function GET() {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const service = createServiceClient();
    const { data: authData, error } = await service.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const { data: orgRowsRaw } = await service
      .from("users_organizations")
      .select("user_id, role, establishment_id, organization_id, organizations(id, name)")
      .eq("deleted", false);

    type OrgRow = {
      user_id: string;
      role: string;
      establishment_id: string | null;
      organization_id: string;
      organizations: { id: string; name: string } | null;
    };
    const orgRows = (orgRowsRaw ?? []) as OrgRow[];

    const orgsByUser = new Map<string, OrgRow[]>();
    for (const row of orgRows) {
      const list = orgsByUser.get(row.user_id) ?? [];
      list.push(row);
      orgsByUser.set(row.user_id, list);
    }

    const users = authData.users.map((u) => {
      const appRole = (u.app_metadata.role as string | undefined) ?? null;
      const userOrgs = orgsByUser.get(u.id) ?? [];
      const orgRole = userOrgs.at(0)?.role ?? null;
      return {
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata.full_name as string | undefined) ?? (u.user_metadata.name as string | undefined) ?? "",
        appRole,
        orgRole,
        role: appRole ?? orgRole ?? "unknown",
        organizations: userOrgs.map((o) => ({
          id: o.organization_id,
          name: o.organizations?.name ?? "",
          role: o.role,
          establishmentId: o.establishment_id,
        })),
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/admin/users:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}

interface CreateUserBody {
  email: string;
  name: string;
  role: "commercial" | "org_admin" | "manager" | "employee";
  organizationIds: string[];
  establishmentId?: string | null;
  employeeId?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const caller = await assertSystemAdmin();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = (await request.json()) as CreateUserBody;
    const { email, name, role, organizationIds, establishmentId, employeeId } = body;

    if (!email) {
      return NextResponse.json({ error: "email et role requis" }, { status: 400 });
    }

    const service = createServiceClient();

    const appMeta = { role };
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: appMeta,
    });
    if (createError) throw createError;

    const userId = created.user.id;

    if (role === "employee") {
      // Lier la fiche employé existante au compte auth
      if (employeeId) {
        const { error: linkError } = await service
          .from("employees")
          .update({ auth_user_id: userId, has_mobile_access: true })
          .eq("id", employeeId);
        if (linkError) throw linkError;
      }
    } else if (organizationIds.length > 0) {
      const rows = organizationIds.map((orgId) => ({
        user_id: userId,
        organization_id: orgId,
        role,
        establishment_id: role === "manager" ? (establishmentId ?? null) : null,
      }));
      const { error: insertError } = await service.from("users_organizations").insert(rows);
      if (insertError) throw insertError;
    }

    await service.auth.admin.generateLink({ type: "recovery", email });

    return NextResponse.json({ userId });
  } catch (err) {
    console.error("POST /api/admin/users:", err);
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
