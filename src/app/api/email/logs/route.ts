import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function buildQuery(supabase: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const status = searchParams.get("status");
  const templateName = searchParams.get("template");
  const organizationId = searchParams.get("organizationId");

  let query = supabase.from("email_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (templateName) {
    query = query.eq("template_name", templateName);
  }

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  return { query, page, limit };
}

function calculateStats(logs: any[], count: number) {
  const stats = {
    total: count ?? 0,
    sent: 0,
    failed: 0,
    pending: 0,
  };

  logs?.forEach((log) => {
    if (log.status === "sent") stats.sent++;
    else if (log.status === "failed") stats.failed++;
    else if (log.status === "pending") stats.pending++;
  });

  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    const { query, page, limit } = await buildQuery(supabase, searchParams);
    const { data: logs, error, count } = await query;

    if (error) {
      console.error("❌ Erreur lors de la récupération des logs:", error);
      return NextResponse.json({ error: "Erreur lors de la récupération des logs" }, { status: 500 });
    }

    const stats = calculateStats(logs, count);

    return NextResponse.json(
      {
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
        },
        stats,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Erreur lors de la récupération des logs:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des logs",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}

// POST pour nettoyer les anciens logs
export async function POST(request: NextRequest) {
  try {
    const { daysToKeep = 30 } = await request.json();

    const supabase = await createClient();

    // Appeler la fonction de nettoyage
    const { data, error } = await supabase.rpc("cleanup_old_email_logs", {
      days_to_keep: daysToKeep,
    });

    if (error) {
      console.error("❌ Erreur lors du nettoyage des logs:", error);
      return NextResponse.json({ error: "Erreur lors du nettoyage des logs" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Nettoyage des logs terminé",
        deletedCount: data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Erreur lors du nettoyage des logs:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du nettoyage des logs",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
