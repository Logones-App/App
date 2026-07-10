"use client";

import { localeLabel } from "@/lib/i18n/localized";
import { useUpdateCardLocales } from "@/lib/queries/public-menu-queries";

/** Langues candidates proposées à l'activation (au-delà, tout code déjà stocké s'affiche aussi). */
const CANDIDATES = ["fr", "en", "es", "it", "de", "nl", "pt"];

/**
 * Choix des langues proposées sur la carte publique. La 1ʳᵉ (primaire) porte le contenu
 * des colonnes de base et n'est pas désactivable.
 */
export function CardLocalesControl({ establishmentId, locales }: { establishmentId: string; locales: string[] }) {
  const update = useUpdateCardLocales(establishmentId);
  const primary = locales[0] ?? "fr";
  const codes = [...new Set([...CANDIDATES, ...locales])];

  const toggle = (code: string) => {
    if (code === primary || update.isPending) return;
    const next = locales.includes(code) ? locales.filter((c) => c !== code) : [...locales, code];
    update.mutate(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground text-sm">Langues de la carte :</span>
      {codes.map((code) => {
        const active = locales.includes(code);
        const isPrimary = code === primary;
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            disabled={isPrimary || update.isPending}
            aria-pressed={active}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted border-transparent"
            } ${isPrimary ? "cursor-default opacity-100" : ""}`}
          >
            {localeLabel(code)}
            {isPrimary && " · principale"}
          </button>
        );
      })}
    </div>
  );
}
