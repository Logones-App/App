"use client";

import { Badge } from "@/components/ui/badge";
import {
  ALLERGENS,
  LABELS,
  PRODUCT_TYPES,
  PORTION_UNITS,
  type AllergenKey,
  type LabelKey,
  type ProductTypeKey,
  getLabelConfig,
} from "@/lib/constants/product-attributes";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── AllergenPicker ───────────────────────────────────────────────────────────

export function AllergenPicker({
  value,
  onChange,
}: {
  value: AllergenKey[];
  onChange: (v: AllergenKey[]) => void;
}) {
  const toggle = (key: AllergenKey) => {
    onChange(
      value.includes(key) ? value.filter((k) => k !== key) : [...value, key],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALLERGENS.map((a) => {
        const active = value.includes(a.key);
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => toggle(a.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
              active
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-background text-muted-foreground hover:border-destructive/50 hover:text-foreground"
            }`}
          >
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── LabelPicker ─────────────────────────────────────────────────────────────

export function LabelPicker({
  value,
  onChange,
}: {
  value: LabelKey[];
  onChange: (v: LabelKey[]) => void;
}) {
  const toggle = (key: LabelKey) => {
    onChange(
      value.includes(key) ? value.filter((k) => k !== key) : [...value, key],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {LABELS.map((l) => {
        const active = value.includes(l.key);
        const config = getLabelConfig(l.key);
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => toggle(l.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
              active
                ? `border-transparent ${config?.color ?? "bg-muted text-foreground"}`
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{l.emoji}</span>
            <span>{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── ProductTypePicker ────────────────────────────────────────────────────────

export function ProductTypePicker({
  value,
  onChange,
}: {
  value: ProductTypeKey | null;
  onChange: (v: ProductTypeKey | null) => void;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : (v as ProductTypeKey))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Choisir un type…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Non défini</SelectItem>
        {PRODUCT_TYPES.map((t) => (
          <SelectItem key={t.key} value={t.key}>
            {t.emoji} {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── PortionInput ─────────────────────────────────────────────────────────────

export function PortionInput({
  weight,
  unit,
  onWeightChange,
  onUnitChange,
}: {
  weight: string;
  unit: string;
  onWeightChange: (v: string) => void;
  onUnitChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        value={weight}
        onChange={(e) => onWeightChange(e.target.value)}
        inputMode="decimal"
        placeholder="200"
        className="w-28 tabular-nums"
      />
      <Select value={unit || "__none__"} onValueChange={(v) => onUnitChange(v === "__none__" ? "" : v)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Unité…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Unité</SelectItem>
          {PORTION_UNITS.map((u) => (
            <SelectItem key={u.key} value={u.key}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── AllergenBadges (affichage lecture seule) ─────────────────────────────────

export function AllergenBadges({ allergens }: { allergens: string[] }) {
  if (!allergens?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((key) => {
        const a = ALLERGENS.find((x) => x.key === key);
        if (!a) return null;
        return (
          <Badge key={key} variant="outline" className="border-destructive/40 text-destructive text-xs">
            {a.emoji} {a.label}
          </Badge>
        );
      })}
    </div>
  );
}

// ─── LabelBadges (affichage lecture seule) ────────────────────────────────────

export function LabelBadges({ labels }: { labels: string[] }) {
  if (!labels?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((key) => {
        const config = getLabelConfig(key);
        if (!config) return null;
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
          >
            {config.emoji} {config.label}
          </span>
        );
      })}
    </div>
  );
}
