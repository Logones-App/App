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

function NoteField({ note, onSave }: { note: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const commit = () => {
    onSave(draft.trim() || null);
    setEditing(false);
  };
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Note pour la carte…"
        className="h-6 text-xs"
      />
    );
  }
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground block text-left text-xs"
      onClick={() => {
        setDraft(note ?? "");
        setEditing(true);
      }}
    >
      {note ?? <span className="opacity-50">+ note</span>}
    </button>
  );
}

function PriceCell({
  price,
  menuName,
  mismatch,
}: {
  price: number | null;
  menuName: string | null;
  mismatch: boolean;
}) {
  return (
    <TableCell className="text-right align-top tabular-nums">
      <div>{price != null ? eur.format(price) : <span className="text-muted-foreground">—</span>}</div>
      {menuName && (
        <div
          className={`text-[10px] leading-tight font-normal ${mismatch ? "text-amber-600" : "text-muted-foreground"}`}
          title={
            mismatch
              ? "Ce prix vient d'un autre menu que la carte de la section — repointez le produit pour un prix cohérent."
              : "Menu d'où provient le prix"
          }
        >
          {mismatch ? "⚠ " : ""}
          {menuName}
        </div>
      )}
    </TableCell>
  );
}

function RowActions({
  isFirst,
  isLast,
  isPending,
  isVisible,
  onMove,
  onToggle,
  onRemove,
}: {
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  isVisible: boolean;
  onMove: (dir: "up" | "down") => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
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
          onClick={onToggle}
          title={isVisible ? "Masquer" : "Afficher"}
        >
          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
  );
}

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
  sectionMenuId,
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
  /** Carte de la section (menu_id) — pour signaler un prix issu d'un autre menu. */
  sectionMenuId: string | null;
}) {
  const mp = item.menus_product;
  const product = mp?.product ?? null;
  const productName = product?.name ?? "—";
  const productDescription = product?.description ?? null;
  // Prix incohérent : la section est rattachée à une carte, mais le prix vient d'un autre menu.
  const priceMismatch = sectionMenuId != null && mp?.menus_id != null && mp.menus_id !== sectionMenuId;

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
          <NoteField note={item.note} onSave={onSaveNote} />
        </div>
      </TableCell>
      <PriceCell price={mp?.price ?? null} menuName={mp?.menu?.name ?? null} mismatch={priceMismatch} />
      <RowActions
        isFirst={isFirst}
        isLast={isLast}
        isPending={isPending}
        isVisible={item.is_visible}
        onMove={onMove}
        onToggle={() => onToggle(!item.is_visible)}
        onRemove={onRemove}
      />
    </TableRow>
  );
}
