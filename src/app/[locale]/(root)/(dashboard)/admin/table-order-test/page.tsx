"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Est = { id: string; name: string; slug: string | null };
type Table = { id: string; name: string };
type Product = { id: string; name: string; price: number | null; vat_rate_entry: { value: number | null } | null };

export default function TableOrderTestPage() {
  const [establishments, setEstablishments] = useState<Est[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [estId, setEstId] = useState("");
  const [tableId, setTableId] = useState("");
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase
      .from("establishments")
      .select("id, name, slug")
      .eq("deleted", false)
      .then(({ data }) => setEstablishments(data ?? []));
  }, []);

  useEffect(() => {
    if (!estId) return;
    setTableId("");
    setProductId("");
    void supabase
      .from("tables")
      .select("id, name")
      .eq("establishment_id", estId)
      .eq("deleted", false)
      .then(({ data }) => setTables(data ?? []));
    void supabase
      .from("products")
      .select("id, name, vat_rate_entry:vat_rate_id(value)")
      .eq("deleted", false)
      .limit(20)
      .then(({ data }) => setProducts((data as unknown as Product[]) ?? []));
  }, [estId]);

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleTest() {
    if (!estId || !tableId || !productId) return;
    setLoading(true);
    setResult(null);

    const body = {
      establishment_id: estId,
      table_id: tableId,
      guest_name: "POS-Test",
      items: [
        {
          product_id: productId,
          name: selectedProduct?.name ?? "Produit test",
          quantity: 1,
          unit_price: 9.99,
          vat_rate: selectedProduct?.vat_rate_entry?.value ?? null,
        },
      ],
    };

    try {
      const res = await fetch("/api/table-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setResult(JSON.stringify({ status: res.status, payload_sent: body, response: json }, null, 2));
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-bold">Test — Commande à table (POS)</h1>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Établissement</label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={estId}
            onChange={(e) => setEstId(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.slug})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Table</label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            disabled={!estId}
          >
            <option value="">Sélectionner…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Produit</label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={!estId}
          >
            <option value="">Sélectionner…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (TVA {p.vat_rate_entry?.value ?? "?"} %)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => void handleTest()}
          disabled={!estId || !tableId || !productId || loading}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Envoi…" : "Envoyer la requête test"}
        </button>
      </div>

      {result && <pre className="bg-muted overflow-auto rounded p-4 text-xs">{result}</pre>}
    </div>
  );
}
