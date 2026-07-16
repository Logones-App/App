"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiSiege {
  siret: string;
  adresse: string;
  code_postal: string;
  commune: string;
  libelle_commune: string;
  activite_principale: string;
}

interface ApiResult {
  nom_complet: string;
  siren: string;
  siege: ApiSiege;
}

interface ApiResponse {
  results?: ApiResult[];
}

export interface CompanyPrefill {
  name: string;
  siret: string;
  no_tva: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  code_naf: string;
}

function computeVatFr(siren: string): string {
  const n = parseInt(siren, 10);
  const key = (12 + 3 * (n % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}

export function CompanySearch({ onSelect }: { onSelect: (fields: CompanyPrefill) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=6`,
        );
        const data = (await res.json()) as ApiResponse;
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const handleSelect = (r: ApiResult) => {
    onSelect({
      name: r.nom_complet,
      siret: r.siege.siret,
      no_tva: computeVatFr(r.siren),
      address: r.siege.adresse,
      postal_code: r.siege.code_postal,
      city: r.siege.libelle_commune || r.siege.commune,
      // L'API interrogée est le registre des entreprises FRANÇAISES : le pays est toujours FR.
      // Il n'est donc pas renvoyé par l'API — on le pose ici plutôt que de laisser le champ vide.
      country: "FR",
      code_naf: r.siege.activite_principale,
    });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative sm:col-span-2">
      <Label className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
        <Search className="h-3 w-3" />
        Rechercher une entreprise (pré-remplissage automatique)
      </Label>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de l'entreprise…"
          autoComplete="new-password"
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="bg-popover border-border absolute z-50 mt-1 w-full rounded-md border shadow-lg">
          {results.map((r) => (
            <button
              key={r.siege.siret}
              type="button"
              className="hover:bg-muted w-full px-3 py-2.5 text-left"
              onMouseDown={() => handleSelect(r)}
            >
              <p className="text-sm font-medium">{r.nom_complet}</p>
              <p className="text-muted-foreground text-xs">
                SIRET {r.siege.siret} · {r.siege.code_postal} {r.siege.libelle_commune || r.siege.commune}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
