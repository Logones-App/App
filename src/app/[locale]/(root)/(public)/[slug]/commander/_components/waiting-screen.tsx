"use client";

import { Loader2, XCircle } from "lucide-react";

import { formatPrice } from "../../menu/_components/menu-utils";

type CartItemDisplay = { id: string; name: string; unitPrice: number };

interface Props {
  cart: CartItemDisplay[];
  tableName: string;
  totalPrice: number;
  timedOut: boolean;
  realtimeStatus: "connecting" | "connected" | "lost";
  onRetry: () => void;
}

export function WaitingScreen({ cart, tableName, totalPrice, timedOut, realtimeStatus, onRetry }: Props) {
  if (timedOut) {
    return (
      <div className="min-h-screen p-6">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <XCircle className="h-14 w-14 text-orange-400" />
          <p className="text-lg font-semibold">Commande non confirmée</p>
          <p className="text-muted-foreground text-sm">Montrez cette page à un serveur pour valider votre commande.</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="mb-2 text-sm font-semibold">Votre commande — {tableName}</p>
          <div className="space-y-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span className="font-medium">{formatPrice(item.unitPrice)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
        <button onClick={onRetry} className="text-primary mt-6 w-full text-center text-sm underline">
          Retenter l&apos;envoi
        </button>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
      <p className="text-lg font-medium">Commande envoyée…</p>
      <p className="text-muted-foreground text-sm">En attente de confirmation par l&apos;équipe</p>
      {realtimeStatus === "lost" && (
        <p className="mt-2 text-xs text-orange-500">Connexion perdue — tentative de reconnexion…</p>
      )}
    </div>
  );
}
