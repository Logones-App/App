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
  formulaInstanceId?: string;
  formulaName?: string;
};

type Segment =
  | { kind: "item"; item: CheckoutCartItem }
  | { kind: "formula"; groupId: string; name: string; price: number; items: CheckoutCartItem[]; note: string };

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
  onFormulaGroupNoteChange: (groupId: string, note: string) => void;
  onEditItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onRemoveFormulaGroup: (groupId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

function buildSegments(cart: CheckoutCartItem[]): Segment[] {
  const result: Segment[] = [];
  const seen = new Set<string>();
  for (const item of cart) {
    if (!item.formulaInstanceId) {
      result.push({ kind: "item", item });
    } else if (!seen.has(item.formulaInstanceId)) {
      seen.add(item.formulaInstanceId);
      const groupItems = cart.filter((c) => c.formulaInstanceId === item.formulaInstanceId);
      result.push({
        kind: "formula",
        groupId: item.formulaInstanceId,
        name: item.formulaName!,
        price: item.unitPrice,
        items: groupItems,
        note: item.note,
      });
    }
  }
  return result;
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
  onFormulaGroupNoteChange,
  onEditItem,
  onRemoveItem,
  onRemoveFormulaGroup,
  onSubmit,
  onBack,
  onCancel,
}: Props) {
  const segments = buildSegments(cart);

  return (
    <div className="space-y-5 p-4">
      <div hidden={cart.length === 0}>
        <h2 className="mb-3 font-semibold">Votre commande</h2>
        <div className="space-y-3">
          {segments.map((seg) =>
            seg.kind === "item" ? (
              <div key={seg.item.id}>
                <div className="hover:bg-muted/50 -mx-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors">
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">{seg.item.name}</span>
                  <span className="font-medium">{formatPrice(seg.item.unitPrice)}</span>
                  <button
                    onClick={() => onEditItem(seg.item.id)}
                    className="text-muted-foreground hover:text-foreground"
                    hidden={!isItemCustomizable(seg.item.menuProductId)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onRemoveItem(seg.item.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={seg.item.note}
                  onChange={(e) => onNoteChange(seg.item.id, e.target.value)}
                  maxLength={200}
                  placeholder="Instructions spéciales, allergies…"
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>
            ) : (
              <div key={seg.groupId} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{seg.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{formatPrice(seg.price)}</span>
                    <button
                      onClick={() => onRemoveFormulaGroup(seg.groupId)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-2 space-y-0.5">
                  {seg.items.map((item) => (
                    <p key={item.id} className="text-sm text-gray-600">
                      {item.name}
                    </p>
                  ))}
                </div>
                <textarea
                  value={seg.note}
                  onChange={(e) => onFormulaGroupNoteChange(seg.groupId, e.target.value)}
                  maxLength={200}
                  placeholder="Instructions spéciales, allergies…"
                  rows={2}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>
            ),
          )}
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
