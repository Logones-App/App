import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Statut d'une demande de commande (table_order_requests) par son id — service_role, ne renvoie QUE le
 * statut et le strict nécessaire à l'écran d'attente. Remplace l'abonnement Realtime anon (qui diffusait
 * la ligne entière, PII comprise). L'id étant un UUID connu du seul client qui a créé la demande, il fait
 * office de capacité ; aucune PII n'est exposée (ni guest_name, ni items).
 */
export type RequestStatus = { status: string; order_id: string | null; rejection_reason: string | null } | null;

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("table_order_requests")
    .select("status, order_id, rejection_reason")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? null) satisfies RequestStatus);
}
