import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { OrderPage } from "./_components/order-page";

export default async function CommanderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; est?: string }>;
}) {
  const { slug } = await params;
  const { table: tableId, est: establishmentId } = await searchParams;

  if (!tableId || !establishmentId) notFound();

  const supabase = await createClient();

  const [estRes, tableRes] = await Promise.all([
    supabase
      .from("establishments")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("deleted", false)
      .single(),
    supabase.from("tables").select("id, name").eq("id", tableId).eq("establishment_id", establishmentId).single(),
  ]);

  if (!estRes.data || !tableRes.data) notFound();

  return (
    <OrderPage
      establishment={{ id: estRes.data.id, name: estRes.data.name, slug: estRes.data.slug ?? slug }}
      tableId={tableId}
      tableName={tableRes.data.name}
      establishmentId={establishmentId}
    />
  );
}
