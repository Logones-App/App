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

    // Nouveau round accepté par le POS → re-fetch
    const requestsChannel = supabase
      .channel(`table-requests-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "table_order_requests", filter: `order_id=eq.${ordersId}` },
        (payload) => {
          if ((payload.new as { status: string }).status === "accepted") refresh();
        },
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
      void supabase.removeChannel(requestsChannel);
      void supabase.removeChannel(ordersChannel);
    };
  }, [ordersId, establishmentId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tableClosed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <h1 className="text-2xl font-bold">Table réglée</h1>
        <p className="text-muted-foreground text-sm">Merci et à bientôt !</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
        <p className="text-muted-foreground text-xs">Commandes — {tableName}</p>
        <h1 className="font-bold">
          {data.guests.length} convive{data.guests.length > 1 ? "s" : ""}
        </h1>
      </header>

      {roundError && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-700">{roundError}</p>
          <button onClick={onClearRoundError} className="ml-3 text-xs text-orange-500 underline">
            OK
          </button>
        </div>
      )}

      <div className="space-y-4 p-4">
        {data.guests.map((guest: TableViewGuest) => (
          <button
            key={guest.name}
            type="button"
            onClick={() => onSelectGuest(guest.name)}
            className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="mb-2 flex items-center gap-2">
              <User className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="font-semibold">
                {guest.name}
                {guest.name === guestName && <span className="text-primary ml-1 text-xs">(vous)</span>}
              </span>
              {pendingGuestName === guest.name && (
                <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                  en attente
                </span>
              )}
            </div>

            <div className="space-y-1">
              {guest.products.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {p.quantity}× {p.product_name}
                  </span>
                  <span>{formatPrice(p.total_price)}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-medium">
              <span>Sous-total</span>
              <span>{formatPrice(guest.subtotal)}</span>
            </div>
          </button>
        ))}

        <div className="flex justify-between rounded-lg bg-black px-4 py-3 text-white">
          <span className="font-bold">Total table</span>
          <span className="font-bold">{formatPrice(data.grand_total)}</span>
        </div>

        <Button variant="outline" className="w-full" onClick={onNewGuest}>
          + Nouveau convive
        </Button>
      </div>
    </div>
  );
}
