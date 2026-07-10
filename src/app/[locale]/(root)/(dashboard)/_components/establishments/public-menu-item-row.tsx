"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { LocalizedContent } from "@/lib/i18n/localized";
import type { PublicMenuItemWithProduct } from "@/lib/queries/public-menu-queries";

import { TranslationsButton, type TranslGroup } from "./public-menu-translations-dialog";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function ItemRow({
  item,
  isFirst,
  isLast,
  isPending,
  locales,
  onToggle,
  onRemove,
  onMove,
  onSaveNote,
  onSaveTranslations,
  onSaveProductTranslations,
}: {
  item: PublicMenuItemWithProduct;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  locales: string[];
  onToggle: (v: boolean) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  onSaveNote: (note: string | null) => void;
  onSaveTranslations: (t: LocalizedContent) => void;
  onSaveProductTranslations: (t: LocalizedContent) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note ?? "");

  const mp = item.menus_product;
  const product = mp?.product ?? null;
  const productName = product?.name ?? "—";
  const productDescription = product?.description ?? null;
  const price = mp?.price ?? null;

  const commitNote = () => {
    const trimmed = noteDraft.trim();
    onSaveNote(trimmed || null);
    setEditingNote(false);
  };

  // Un seul dialogue de traduction regroupant le produit (global) et la note (cette carte).
  const translationGroups: TranslGroup[] = [
    ...(product
      ? [
          {
            label: "Produit",
            translations: product.translations,
            onSave: onSaveProductTranslations,
            fields: [
              { key: "name", label: "Nom", base: product.name },
              { key: "description", label: "Description", base: product.description, multiline: true },
            ],
          },
        ]
      : []),
    {
      label: "Note (cette carte)",
      translations: item.translations,
      onSave: onSaveTranslations,
      fields: [{ key: "note", label: "Note", base: item.note }],
    },
  ];

  return (
    <TableRow className={item.is_visible ? undefined : "opacity-50"}>
      <TableCell className="font-medium">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span>{productName}</span>
            <TranslationsButton
              title={productName}
              triggerTitle="Traduire (nom, description, note)"
              locales={locales}
              groups={translationGroups}
              isPending={isPending}
            />
          </div>
          {productDescription && (
            <p className="text-muted-foreground text-xs font-normal whitespace-pre-line italic">{productDescription}</p>
          )}
          {editingNote ? (
            <Input
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNote}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNote();
                if (e.key === "Escape") setEditingNote(false);
              }}
              placeholder="Note pour la carte…"
              className="h-6 text-xs"
            />
          ) : (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground block text-left text-xs"
              onClick={() => {
                setNoteDraft(item.note ?? "");
                setEditingNote(true);
              }}
            >
              {item.note ?? <span className="opacity-50">+ note</span>}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {price != null ? eur.format(price) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isFirst || isPending}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isLast || isPending}
            onClick={() => onMove("down")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isPending}
            onClick={() => onToggle(!item.is_visible)}
            title={item.is_visible ? "Masquer" : "Afficher"}
          >
            {item.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            disabled={isPending}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
