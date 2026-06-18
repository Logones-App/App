"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { formatPrice } from "../../menu/_components/menu-utils";

export type CheckoutCartItem = {
  id: string;
  menuProductId: string;
  name: string;
  unitPrice: number;
  note: string;
};

interface Props {
  cart: CheckoutCartItem[];
  totalPrice: number;
  guestName: string;
  isAddingItems: boolean;
  isSubmitting: boolean;
  error: string | null;
  isItemCustomizable: (menuProductId: string) => boolean;
  onGuestNameChange: (name: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onEditItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function CheckoutStep({
  cart,
  totalPrice,
  guestName,
  isAddingItems,
  isSubmitting,
  error,
  isItemCustomizable,
  onGuestNameChange,
  onNoteChange,
  onEditItem,
  onRemoveItem,
  onSubmit,
  onBack,
  onCancel,
}: Props) {
  return (
    <div className="space-y-5 p-4">
      <div hidden={cart.length === 0}>
        <h2 className="mb-3 font-semibold">Votre commande</h2>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.id}>
              <div className="hover:bg-muted/50 -mx-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors">
                <span className="text-muted-foreground min-w-0 flex-1 truncate">{item.name}</span>
                <span className="font-medium">{formatPrice(item.unitPrice)}</span>
                <button
                  onClick={() => onEditItem(item.id)}
                  className="text-muted-foreground hover:text-foreground"
                  hidden={!isItemCustomizable(item.menuProductId)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={item.note}
                onChange={(e) => onNoteChange(item.id, e.target.value)}
                maxLength={200}
                placeholder="Instructions spéciales, allergies…"
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Votre prénom *</label>
        <Input
          value={guestName}
          onChange={(e) => onGuestNameChange(e.target.value)}
          placeholder="Entrez votre prénom"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />
      </div>
      <p hidden={!error} className="text-destructive text-sm">
        {error}
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onSubmit} disabled={!guestName.trim() || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Envoyer ma commande
        </Button>
        {isAddingItems ? (
          <Button variant="ghost" onClick={onCancel}>
            ← Annuler
          </Button>
        ) : (
          <Button variant="ghost" onClick={onBack}>
            <span hidden={cart.length === 0}>← Modifier la commande</span>
            <span hidden={cart.length > 0}>Choisir des produits →</span>
          </Button>
        )}
      </div>
    </div>
  );
}
