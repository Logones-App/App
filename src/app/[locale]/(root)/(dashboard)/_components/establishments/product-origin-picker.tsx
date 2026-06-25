"use client";

import { useState } from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CountryFlag } from "@/components/ui/country-flag";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES } from "@/lib/constants/countries";
import { cn } from "@/lib/utils";

export function OriginPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);

  const toggle = (code: string) => {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  };

  const selectedCountries = COUNTRIES.filter((c) => value.includes(c.code));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={value.length === 0 ? "text-muted-foreground" : ""}>
              {value.length === 0
                ? "Ajouter un pays d'origine…"
                : `${value.length} pays sélectionné${value.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un pays…" />
            <CommandList>
              <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => (
                  <CommandItem key={country.code} value={country.name} onSelect={() => toggle(country.code)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value.includes(country.code) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <CountryFlag code={country.code} className="mr-1.5 h-4 w-auto rounded-sm" />
                    {country.name}
                    <span className="text-muted-foreground ml-auto text-xs">{country.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCountries.map((country) => (
            <Badge key={country.code} variant="secondary" className="gap-1.5 pr-1.5">
              <CountryFlag code={country.code} className="h-3.5 w-auto rounded-sm" />
              {country.name}
              <button
                type="button"
                onClick={() => toggle(country.code)}
                className="hover:bg-muted ml-0.5 rounded-sm p-0.5"
                aria-label={`Retirer ${country.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
