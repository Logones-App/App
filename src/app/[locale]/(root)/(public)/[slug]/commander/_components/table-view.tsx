"use client";

import { useEffect, useState } from "react";

import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, User } from "lucide-react";

import type { TableViewGuest, TableViewResponse } from "@/app/api/table-order/table-view/route";
import { Button } from "@/components/ui/button";

import { formatPrice } from "../../menu/_components/menu-utils";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Props {
  ordersId: string;
  establishmentId: string;
  tableName: string;
  guestName: string;
  onSelectGuest: (name: string) => void;
  onNewGuest: () => void;
  pendingGuestName: string | null;
  roundError?: string | null;
  onClearRoundError?: () => void;
}

async function fetchTableView(ordersId: string, establishmentId: string): Promise<TableViewResponse | null> {
  const res = await fetch(`/api/table-order/table-view?orders_id=${ordersId}&est=${establishmentId}`);
  if (!res.ok) return null;
  return res.json() as Promise<TableViewResponse>;
}

export function TableView({
  ordersId,
  establishmentId,
  tableName,
  guestName,
  onSelectGuest,
  onNewGuest,
  pendingGuestName,
  roundError,
  onClearRoundError,
}: Props) {
  const [data, setData] = useState<TableViewResponse | null>(null);
  const [tableClosed, setTableClosed] = useState(false);

  useEffect(() => {
    void fetchTableView(ordersId, establishmentId).then((d) => {
      if (d) setData(d);
    });
  }, [ordersId, establishmentId]);

  useEffect(() => {
    const refresh = () => {
      setTimeout(() => {
        void fetchTableView(ordersId, establishmentId).then((d) => {
          if (d) setData(d);
        });
      }, 300);
    };

    // Produits ajoutés / annulés par le POS
    const productsChannel = supabase
      .channel(`order-products-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_products", filter: `order_id=eq.${ordersId}` },
        refresh,
      )
      .subscribe();

    // Nouvelles notes (convives) créées par le POS
    const paymentsChannel = supabase
      .channel(`order-payments-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_payments", filter: `orders_id=eq.${ordersId}` },
        refresh,
      )
      .subscribe();

    // Attributions produit ↔ note modifiées
    const rowsChannel = supabase
      .channel(`order-payments-rows-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_payments_rows",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        refresh,
      )
      .subscribe();

    // Table fermée côté POS
    const ordersChannel = supabase
      .channel(`table-orders-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${ordersId}` },
        (payload) => {
          if ((payload.new as { opened: boolean }).opened === false) setTableClosed(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(productsChannel);
      void supabase.removeChannel(paymentsChannel);
      void supabase.removeChannel(rowsChannel);
      void supabase.removeChannel(ordersChannel);
    };
  }, [ordersId, establishmentId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tableClosed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Table réglée</h1>
        <p className="text-sm text-gray-600">Merci et à bientôt !</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <header className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <p className="text-xs text-gray-400">Commandes — {tableName}</p>
        <h1 className="font-bold text-white">
          {data.guests.length} convive{data.guests.length > 1 ? "s" : ""}
        </h1>
      </header>

      {roundError && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-700">{roundError}</p>
          <button onClick={onClearRoundError} className="ml-3 text-xs text-orange-500 underline">
            OK
          </button>
        </div>
      )}

      <div className="space-y-3 p-4">
        {data.guests.map((guest: TableViewGuest) => (
          <button
            key={guest.name}
            type="button"
            onClick={() => onSelectGuest(guest.name)}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="font-bold text-gray-900">
                {guest.name}
                {guest.name === guestName && <span className="text-primary ml-1 text-xs font-semibold">(vous)</span>}
              </span>
              {pendingGuestName === guest.name && (
                <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                  en attente
                </span>
              )}
            </div>

            <div className="space-y-1">
              {guest.products.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{p.product_name}</span>
                  <span className="font-medium text-gray-900">{formatPrice(p.amount)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold text-gray-900">
              <span>Sous-total</span>
              <span>{formatPrice(guest.subtotal)}</span>
            </div>
          </button>
        ))}

        <div className="flex justify-between rounded-xl bg-gray-900 px-4 py-3 text-white">
          <span className="font-bold">Total table</span>
          <span className="font-bold">{formatPrice(data.grand_total)}</span>
        </div>

        <Button
          variant="outline"
          className="w-full border-gray-300 bg-white font-semibold text-gray-800 hover:bg-gray-50"
          onClick={onNewGuest}
        >
          + Nouveau convive
        </Button>
      </div>
    </div>
  );
}
