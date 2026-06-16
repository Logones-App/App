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
  onAddRound?: () => void;
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
  onAddRound,
  roundError,
  onClearRoundError,
}: Props) {
  const [data, setData] = useState<TableViewResponse | null>(null);
  const [knownPaymentIds, setKnownPaymentIds] = useState<Set<string>>(new Set());
  const [tableClosed, setTableClosed] = useState(false);

  useEffect(() => {
    void fetchTableView(ordersId, establishmentId).then((d) => {
      if (!d) return;
      setData(d);
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

    const paymentsChannel = supabase
      .channel(`table-payments-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_payments", filter: `orders_id=eq.${ordersId}` },
        (payload) => {
          const id = (payload.new as { id: string }).id;
          setKnownPaymentIds((prev) => new Set([...prev, id]));
          refresh();
        },
      )
      .subscribe();

    const rowsChannel = supabase
      .channel(`table-rows-${ordersId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_payments_rows",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload) => {
          const ordersPaymentsId = (payload.new as { orders_payments_id: string | null }).orders_payments_id;
          if (ordersPaymentsId && knownPaymentIds.has(ordersPaymentsId)) refresh();
        },
      )
      .subscribe();

    // Paiement d'un convive → re-fetch pour mettre à jour paid
    const paidChannel = supabase
      .channel(`table-paid-${ordersId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_payments", filter: `orders_id=eq.${ordersId}` },
        () => refresh(),
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
      void supabase.removeChannel(paymentsChannel);
      void supabase.removeChannel(rowsChannel);
      void supabase.removeChannel(paidChannel);
      void supabase.removeChannel(ordersChannel);
    };
  }, [ordersId, establishmentId, knownPaymentIds]);

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

  const allPaid = data.guests.every((g) => g.allPaid);

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
        <p className="text-muted-foreground text-xs">Commandes — {tableName}</p>
        <h1 className="font-bold">
          {allPaid ? "Table réglée ✓" : `${data.guests.length} convive${data.guests.length > 1 ? "s" : ""}`}
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
          <div key={guest.name} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="text-muted-foreground h-4 w-4" />
                <span className="font-semibold">
                  {guest.name}
                  {guest.name === guestName && <span className="text-primary ml-1 text-xs">(vous)</span>}
                </span>
              </div>
              {guest.allPaid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
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
          </div>
        ))}

        <div className="flex justify-between rounded-lg bg-black px-4 py-3 text-white">
          <span className="font-bold">Total table</span>
          <span className="font-bold">{formatPrice(data.grand_total)}</span>
        </div>

        {onAddRound && !allPaid && (
          <Button variant="outline" className="w-full" onClick={onAddRound}>
            + Ajouter des articles
          </Button>
        )}
      </div>
    </div>
  );
}
