import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = (await req.json()) as {
      establishment_id: string;
      table_id: string;
      guest_name: string;
      items: unknown[];
    };

    const { establishment_id, table_id, guest_name, items } = body;

    if (!establishment_id || !table_id || !guest_name?.trim() || !items?.length) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: table, error: tableErr } = await supabase
      .from("tables")
      .select("id, name, organization_id")
      .eq("id", table_id)
      .eq("establishment_id", establishment_id)
      .maybeSingle();

    if (tableErr || !table) {
      return new Response(JSON.stringify({ error: "Table introuvable" }), { status: 404, headers: CORS });
    }

    let organizationId: string | null = table.organization_id ?? null;
    if (!organizationId) {
      const { data: est } = await supabase
        .from("establishments")
        .select("organization_id")
        .eq("id", establishment_id)
        .single();
      organizationId = est?.organization_id ?? null;
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), { status: 400, headers: CORS });
    }

    const { data: order, error: orderErr } = await supabase
      .from("table_order_requests")
      .insert({
        establishment_id,
        organization_id: organizationId,
        table_id,
        table_label: table.name,
        guest_name: guest_name.trim(),
        items,
        status: "pending",
      })
      .select("id, status, table_label, guest_name")
      .single();

    if (orderErr) {
      return new Response(JSON.stringify({ error: orderErr.message }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify(order), { headers: CORS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: CORS });
  }
});
