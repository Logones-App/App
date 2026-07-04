"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Check, ChevronRight, Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { AllergenBadges, LabelBadges } from "@/components/ui/product-attribute-pickers";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { resolveProductBehaviors } from "@/lib/constants/product-attributes";
import type { Tables } from "@/lib/supabase/database.types";

import { type EditableField, useProductInlineEdit } from "./use-product-inline-edit";

type ProductRow = Tables<"products">;
type InlineEdit = ReturnType<typeof useProductInlineEdit>;

export function InlineTextCell({
  value,
  placeholder,
  isActive,
  onActivate,
  onSave,
  onCancel,
  onTabNext,
  className,
}: {
  value: string | null;
  placeholder?: string;
  isActive: boolean;
  onActivate: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  onTabNext: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setDraft(value ?? "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isActive, value]);

  if (isActive) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave(draft);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            onSave(draft);
            onTabNext();
          }
        }}
        className={`h-7 px-2 text-sm ${className ?? ""}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onFocus={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onActivate();
      }}
      className={`hover:bg-muted/60 focus:ring-ring block cursor-text rounded px-1 py-0.5 focus:ring-1 focus:outline-none ${className ?? ""}`}
      title="Cliquer pour modifier"
    >
      {value ?? <span className="text-muted-foreground italic">{placeholder ?? "—"}</span>}
    </span>
  );
}

function StatusBadges({ product }: { product: ProductRow }) {
  const types = (product.product_type as string[] | null) ?? [];
  const behavior = resolveProductBehaviors(types);
  if (!behavior.isForSale && types.length > 0)
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        Non vendu
      </Badge>
    );
  if (!behavior.showInPOS && behavior.isForSale)
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        Hors POS
      </Badge>
    );
  return null;
}

export function ProductListRow({
  product: p,
  edit,
  normalizedBase,
  onArchive,
  indent = false,
  badge,
}: {
  product: ProductRow;
  edit: InlineEdit;
  normalizedBase: string;
  onArchive: (id: string) => void;
  /** Format imbriqué sous une matière → légère indentation. */
  indent?: boolean;
  /** Étiquette optionnelle affichée après le nom (ex. « matière », « format »). */
  badge?: string;
}) {
  const isCell = (field: EditableField) => edit.activeCell?.productId === p.id && edit.activeCell.field === field;
  const namePad = indent ? "pl-10 md:pl-14" : "pl-4 md:pl-6";

  if (edit.editingRowId === p.id) {
    return (
      <TableRow className="border-l-primary bg-muted/20 border-l-2 md:border-l-[3px]">
        <TableCell className={`${namePad} font-medium`}>
          <Link href={`${normalizedBase}/${p.id}`} className="hover:underline">
            {p.name}
          </Link>
        </TableCell>
        <TableCell className="hidden max-w-[280px] md:table-cell">
          <Input
            autoFocus
            value={edit.rowDraft.description ?? ""}
            onChange={(e) => edit.patchRowDraft({ description: e.target.value || null })}
            className="h-7 px-2 text-sm"
            placeholder="Description"
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Switch
              checked={edit.rowDraft.is_available ?? true}
              onCheckedChange={(v) => edit.patchRowDraft({ is_available: v })}
              id={`row-avail-${p.id}`}
            />
            <label htmlFor={`row-avail-${p.id}`} className="cursor-pointer text-sm">
              {edit.rowDraft.is_available ? "Dispo" : "Indispo"}
            </label>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700"
              onClick={() => edit.confirmRowEdit(p.id)}
              disabled={edit.isPending}
              aria-label="Confirmer"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive h-7 w-7"
              onClick={edit.cancelRowEdit}
              aria-label="Annuler"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="border-l-primary/25 border-l-2 md:border-l-[3px]">
      <TableCell className={`${namePad} font-medium`}>
        <div className="flex items-center gap-2">
          <Link href={`${normalizedBase}/${p.id}`} className="hover:underline">
            {p.name}
          </Link>
          {badge && (
            <Badge variant="outline" className="text-muted-foreground text-[10px] font-normal">
              {badge}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground hidden max-w-[280px] md:table-cell">
        <InlineTextCell
          value={p.description}
          placeholder="—"
          isActive={isCell("description")}
          onActivate={() => edit.activateCell(p.id, "description")}
          onSave={(v) => edit.saveCell(p.id, "description", v || null)}
          onCancel={edit.deactivateCell}
          onTabNext={() => edit.tabToNext(p.id, "description")}
          className="truncate"
        />
        {(() => {
          const allergens = p.allergens as string[] | null;
          const lbls = p.labels as string[] | null;
          const origs = p.origins as string[] | null;
          if (!allergens?.length && !lbls?.length && !origs?.length) return null;
          return (
            <div className="mt-1 space-y-1">
              {!!origs?.length && (
                <div className="flex flex-wrap gap-1">
                  {origs.map((code) => (
                    <CountryFlag key={code} code={code} className="h-3.5 w-auto rounded-sm" />
                  ))}
                </div>
              )}
              <AllergenBadges allergens={allergens ?? []} />
              <LabelBadges labels={lbls ?? []} />
            </div>
          );
        })()}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => edit.saveCell(p.id, "is_available", !p.is_available)}
            className="focus:ring-ring rounded focus:ring-1 focus:outline-none"
            title="Cliquer pour basculer"
          >
            <Badge variant={p.is_available ? "default" : "secondary"}>
              {p.is_available ? "Disponible" : "Indisponible"}
            </Badge>
          </button>
          <StatusBadges product={p} />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => edit.startRowEdit(p)}
            aria-label={`Éditer ${p.name}`}
            title="Éditer toute la ligne"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            aria-label={`Archiver ${p.name}`}
            title="Archiver ce produit"
            onClick={() => onArchive(p.id)}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label={`Ouvrir ${p.name}`}>
            <Link href={`${normalizedBase}/${p.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
