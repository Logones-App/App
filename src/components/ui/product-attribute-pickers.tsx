"use client";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";

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

// ─── ProductTypePicker — 2 choix exclusifs (Recette / Ingrédient) ─────────────

export function ProductTypePicker({
  value,
  onChange,
}: {
  value: ProductTypeKey[];
  onChange: (v: ProductTypeKey[]) => void;
}) {
  const toggle = (key: ProductTypeKey) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {PRODUCT_TYPES.map((t) => {
          const active = value.includes(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus:ring-ring focus:ring-2 focus:outline-none ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="mt-0.5 font-medium">{t.label}</span>
              <span className={`mt-0.5 text-xs leading-tight ${active ? "text-primary/80" : "text-muted-foreground"}`}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
      <div className="bg-muted/40 text-muted-foreground rounded-md p-2.5 text-xs leading-relaxed">
        <strong className="text-foreground">Plusieurs types possibles</strong> quand un produit cumule les rôles :
        <ul className="mt-1 list-none space-y-0.5">
          <li>
            🧄 + 🍽️ <strong>Ingrédient + Recette</strong> = préparation maison (ex : sauce tomate cuisinée puis
            utilisée dans plusieurs plats).
          </li>
          <li>
            🧄 + 🛒 <strong>Ingrédient + Achat direct</strong> = utilisé en cuisine ET vendu tel quel (ex : bouteille
            d&apos;huile, Coca versé en cocktail ou vendu en canette).
          </li>
          <li>
            🍽️ + 🛒 <strong>Recette + Achat direct</strong> = cuisiné maison certains jours, acheté prêt d&apos;autres
            (ex : pain, dessert).
          </li>
        </ul>
        <p className="mt-1">
          Astuce : si tu vends le <em>même stock</em> sous plusieurs formes (vin à la bouteille <em>et</em> au verre),
          crée plutôt un <strong>ingrédient</strong> (le vin) + des <strong>recettes</strong> (bouteille, verre).
        </p>
      </div>
    </div>
  );
}

// ─── ProductTypeBadges (lecture seule) ────────────────────────────────────────

export function ProductTypeBadges({ types }: { types: string[] }) {
  if (!types?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((key) => {
        const t = PRODUCT_TYPES.find((x) => x.key === key);
        if (!t) return null;
        return (
          <span key={key} className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-xs text-primary">
            {t.emoji} {t.label}
          </span>
        );
      })}
    </div>
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
  const t = useTranslations("units");
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
            <SelectItem key={u} value={u}>
              {t(u)}
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
