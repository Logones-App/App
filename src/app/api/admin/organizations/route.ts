import { NextRequest, NextResponse } from "next/server";

import { generateSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = user.app_metadata.role as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = (await req.json()) as {
      name?: string | null;
      description?: string | null;
      subscription_plan?: string | null;
    };
    if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const svc = createServiceClient();
    const slug = `${generateSlug(body.name.trim())}-${Math.random().toString(36).slice(2, 7)}`;

    const { data, error } = await svc
      .from("organizations")
      .insert({
        name: body.name.trim(),
        slug,
        description: body.description ?? null,
        subscription_plan: body.subscription_plan ?? "starter",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ orgId: data.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/organizations error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inattendue" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const role = (userData.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined;
    if (role !== "system_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const service = createServiceClient();
    const { data, error } = await service
      .from("organizations")
      .select("id, name, establishments(id, name)")
      .eq("deleted", false)
      .order("name");
    if (error) throw error;

    return NextResponse.json({ organizations: data });
  } catch (err) {
    console.error("GET /api/admin/organizations:", err);
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
