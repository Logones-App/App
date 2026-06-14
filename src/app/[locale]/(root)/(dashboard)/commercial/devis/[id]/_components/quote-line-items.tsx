"use client";

import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { type QuoteLineDraft, fmtEur } from "../../_components/quotes-types";

interface Props {
  items: QuoteLineDraft[];
  onChange: (items: QuoteLineDraft[]) => void;
  readonly?: boolean;
}

function updateLine(
  items: QuoteLineDraft[],
  tempId: string,
  field: keyof QuoteLineDraft,
  value: unknown,
): QuoteLineDraft[] {
  return items.map((item) => {
    if (item.tempId !== tempId) return item;
    const updated = { ...item, [field]: value };
    updated.total_ht = Math.round(updated.quantity * updated.unit_price * 100) / 100;
    return updated;
  });
}

export function QuoteLineItems({ items, onChange, readonly = false }: Props) {
  function handleAddLine() {
    const newLine: QuoteLineDraft = {
      tempId: crypto.randomUUID(),
      product_id: null,
      designation: "",
      quantity: 1,
      unit_price: 0,
      purchase_price: 0,
      price_type: "one_time",
      total_ht: 0,
      position: items.length,
    };
    onChange([...items, newLine]);
  }

  function handleDelete(tempId: string) {
    onChange(items.filter((i) => i.tempId !== tempId));
  }

  function handleChange(tempId: string, field: keyof QuoteLineDraft, raw: string) {
    const isNum = field === "quantity" || field === "unit_price" || field === "purchase_price";
    const value = isNum ? parseFloat(raw) || 0 : raw;
    onChange(updateLine(items, tempId, field, value));
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-muted-foreground hidden grid-cols-[1fr_60px_90px_90px_80px_80px_32px] gap-2 px-2 text-xs sm:grid">
        <span>Désignation</span>
        <span className="text-right">Qté</span>
        <span className="text-right">PU HT (€)</span>
        <span className="text-right">PA (€)</span>
        <span>Type</span>
        <span className="text-right">Total HT</span>
        <span />
      </div>

      {items.map((item) => (
        <div
          key={item.tempId}
          className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_60px_90px_90px_80px_80px_32px]"
        >
          <Input
            value={item.designation}
            onChange={(e) => handleChange(item.tempId, "designation", e.target.value)}
            placeholder="Désignation du produit / service"
            className="text-sm"
            readOnly={readonly}
          />
          <Input
            type="number"
            min="0"
            step="1"
            value={item.quantity}
            onChange={(e) => handleChange(item.tempId, "quantity", e.target.value)}
            className="hidden text-right text-sm sm:block"
            readOnly={readonly}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price}
            onChange={(e) => handleChange(item.tempId, "unit_price", e.target.value)}
            className="hidden text-right text-sm sm:block"
            readOnly={readonly}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.purchase_price}
            onChange={(e) => handleChange(item.tempId, "purchase_price", e.target.value)}
            className="hidden text-right text-sm sm:block"
            placeholder="0.00"
            readOnly={readonly}
          />
          <Select
            value={item.price_type}
            onValueChange={(v) => handleChange(item.tempId, "price_type", v)}
            disabled={readonly}
          >
            <SelectTrigger className="hidden text-xs sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">Unique</SelectItem>
              <SelectItem value="monthly">/mois</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden items-center justify-end sm:flex">
            <Badge variant="secondary" className="font-mono text-xs">
              {fmtEur(item.total_ht)}
            </Badge>
          </div>
          {readonly ? (
            <div />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => handleDelete(item.tempId)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      {!readonly && (
        <Button variant="outline" size="sm" className="mt-1 w-full" onClick={handleAddLine}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
