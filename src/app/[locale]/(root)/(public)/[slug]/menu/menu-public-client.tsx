"use client";

import React, { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { ArrowLeft, MapPin, Phone, UtensilsCrossed } from "lucide-react";

import { SectionNode } from "./_components/menu-components";
import {
  filterSectionsByCard,
  flattenSectionItems,
  getPublicCarteSections,
  getPublicEstablishmentBySlug,
  getPublicMenus,
  localizeSections,
  type PublicEstablishment,
  type PublicMenuCard,
  type PublicSection,
} from "./_components/menu-utils";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

/** Nom natif d'une langue (endonyme), repli sur le code en majuscules. */
function localeName(code: string): string {
  try {
    const label = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export default function MenuPublicClient({ params }: Props) {
  const [establishment, setEstablishment] = useState<PublicEstablishment | null>(null);
  const [rawSections, setRawSections] = useState<PublicSection[]>([]);
  const [locale, setLocale] = useState("fr");
  const [cards, setCards] = useState<PublicMenuCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then(async ({ slug, locale: urlLocale }) => {
      const estab = await getPublicEstablishmentBySlug(slug);
      if (!estab) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEstablishment(estab);
      setLocale(estab.locales.includes(urlLocale) ? urlLocale : estab.locales[0]);
      const [secs, publicMenus] = await Promise.all([getPublicCarteSections(estab.id), getPublicMenus(estab.id)]);
      setRawSections(secs);
      setCards(publicMenus);
      setSelectedCard(publicMenus[0]?.id ?? null);
      setLoading(false);
    });
  }, [params]);

  const primary = establishment?.locales[0] ?? "fr";
  const localized = useMemo(() => localizeSections(rawSections, locale, primary), [rawSections, locale, primary]);
  const sections = useMemo(
    () => (cards.length > 0 ? filterSectionsByCard(localized, selectedCard) : localized),
    [localized, cards, selectedCard],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Chargement du menu…</p>
        </div>
      </div>
    );
  }

  if (notFound || !establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <UtensilsCrossed className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h1 className="mb-2 text-xl font-bold">Menu non disponible</h1>
          <p className="text-muted-foreground text-sm">Cet établissement n&apos;est pas public ou n&apos;existe pas.</p>
        </div>
      </div>
    );
  }

  const hasAllergens = flattenSectionItems(sections).some((p) => p.allergens.length > 0);
  const showSwitcher = establishment.locales.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 border-b bg-white/95 shadow-sm backdrop-blur dark:bg-gray-900/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            href={`/${establishment.slug}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex-1 truncate">
            <h1 className="truncate font-semibold">{establishment.name}</h1>
          </div>
          {showSwitcher && (
            <div className="flex shrink-0 items-center gap-1">
              {establishment.locales.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  aria-pressed={locale === code}
                  title={localeName(code)}
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

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{establishment.name}</h2>
          {establishment.description && (
            <p className="text-muted-foreground mt-1 text-sm">{establishment.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4">
            {establishment.address && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {establishment.address}
              </span>
            )}
            {establishment.phone && (
              <a
                href={`tel:${establishment.phone}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
              >
                <Phone className="h-3.5 w-3.5" />
                {establishment.phone}
              </a>
            )}
          </div>
        </div>

        {cards.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCard(c.id)}
                aria-pressed={selectedCard === c.id}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
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

        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <UtensilsCrossed className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <h3 className="font-semibold">Carte non configurée</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              La carte de cet établissement n&apos;est pas encore disponible.
            </p>
          </div>
        ) : (
          <div>
            {sections.map((section) => (
              <SectionNode key={section.id} section={section} depth={0} locale={locale} />
            ))}
          </div>
        )}

        {hasAllergens && (
          <p className="text-muted-foreground mt-8 text-center text-xs">
            Les allergènes sont indiqués en rouge sur chaque plat. En cas de doute, demandez à notre équipe.
          </p>
        )}
      </main>
    </div>
  );
}
