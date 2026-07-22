"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Clock, Loader2, User } from "lucide-react";

import type {
  PendingRequest,
  TableViewGuest,
  TableViewItem,
  TableViewResponse,
} from "@/app/api/table-order/table-view/route";
import { Button } from "@/components/ui/button";

import { formatPrice } from "../../menu/_components/menu-utils";

// POLLING (plus d'abonnement Realtime anon) : on re-fetch la vue via la route service_role à intervalle
// régulier. Toutes les données (dont les demandes en attente) viennent déjà de cette route.
const TABLE_VIEW_POLL_MS = 3000;

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

// ─── Section en cours de validation ──────────────────────────────────────────

function PendingSection({ pending }: { pending: PendingRequest[] }) {
  if (!pending.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-bold text-amber-800">En cours de validation</span>
      </div>
      <div className="space-y-3">
        {pending.map((req, i) => (
          <div key={i}>
            <p className="mb-1 text-xs font-semibold text-amber-700">{req.guest_name}</p>
            <div className="space-y-0.5">
              {req.items.map((item, j) => (
                <p key={j} className="text-sm text-amber-800">
                  {item.quantity}× {item.name}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rendu d'un item (produit ou formule) ─────────────────────────────────────

function GuestItem({ item }: { item: TableViewItem }) {
  if (item.kind === "product") {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{item.product_name}</span>
        <span className="font-medium text-gray-900">{formatPrice(item.amount)}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-gray-800">{item.formula_name}</span>
        <span className="font-medium text-gray-900">{formatPrice(item.amount)}</span>
      </div>
      <div className="mt-0.5 ml-2 space-y-0.5">
        {item.products.map((name, i) => (
          <p key={i} className="text-xs text-gray-500">
            {name}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

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

  // Chargement initial + rafraîchissement par polling. `table_closed` (renvoyé par la route) remplace
  // l'ancien abonnement Realtime `orders`.
  useEffect(() => {
    let stopped = false;
    const load = () =>
      fetchTableView(ordersId, establishmentId).then((d) => {
        if (stopped || !d) return;
        setData(d);
        if (d.table_closed) setTableClosed(true);
      });
    void load();
    const interval = setInterval(() => void load(), TABLE_VIEW_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
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
        <PendingSection pending={data.pending} />

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

            <div className="space-y-1.5">
              {guest.items.map((item, i) => (
                <GuestItem key={i} item={item} />
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
