"use client";

import { localeLabel } from "@/lib/i18n/localized";

import type { PublicMenuCard } from "../../menu/_components/menu-utils";

/** En-tête de la page commande QR : établissement/table + sélecteur de langue + bascule de cartes. */
export function OrderBrowseHeader({
  establishmentName,
  tableName,
  showBack,
  onBack,
  locales,
  locale,
  onLocale,
  cards,
  selectedCard,
  onCard,
  showCards,
}: {
  establishmentName: string;
  tableName: string;
  showBack: boolean;
  onBack: () => void;
  locales: string[];
  locale: string;
  onLocale: (code: string) => void;
  cards: PublicMenuCard[];
  selectedCard: string | null;
  onCard: (id: string) => void;
  showCards: boolean;
}) {
  return (
    <>
      <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs">{establishmentName}</p>
            <h1 className="font-bold">{tableName}</h1>
            <button hidden={!showBack} onClick={onBack} className="text-primary mt-0.5 text-xs underline">
              ← Commande en cours
            </button>
          </div>
          {locales.length > 1 && (
            <div className="flex shrink-0 items-center gap-1">
              {locales.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onLocale(code)}
                  aria-pressed={locale === code}
                  title={localeLabel(code)}
                  className={`rounded px-2 py-1 text-xs font-medium uppercase transition-colors ${
                    locale === code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {showCards && cards.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b px-4 py-2">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCard(c.id)}
              aria-pressed={selectedCard === c.id}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                selectedCard === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted border"
              }`}
            >
              {c.name ?? "Carte"}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
