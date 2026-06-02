"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationProducts } from "@/lib/queries/establishments-related-queries";
import { useSuppliers } from "@/lib/queries/supplier-queries";

export const ORDER_UNITS = [
  "kg",
  "g",
  "L",
  "cl",
  "ml",
  "pièce",
  "portion",
  "carton",
  "boîte",
  "sac",
  "barquette",
  "bouteille",
  "bidon",
  "sachet",
  "palette",
  "caisse",
];

export function normalizeUnit(v: string) {
  return v.toLowerCase().replace(/\s+/g, "");
}

export function OrderUnitField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const matched = ORDER_UNITS.find((u) => normalizeUnit(u) === normalizeUnit(value));
  const [mode, setMode] = useState<"select" | "custom">(value && !matched ? "custom" : "select");
  const [customValue, setCustomValue] = useState(value && !matched ? value : "");

  if (mode === "custom") {
    return (
      <div className="flex gap-1.5">
        <Input
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="ex: colis"
          className="h-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 px-2 text-xs"
          onClick={() => {
            setMode("select");
            onChange("");
          }}
        >
          ↩ Liste
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={matched ?? ""}
      onValueChange={(v) => {
        if (v === "__custom__") {
          setMode("custom");
          setCustomValue("");
          onChange("");
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choisir…" />
      </SelectTrigger>
      <SelectContent>
        {ORDER_UNITS.map((u) => (
          <SelectItem key={u} value={u}>
            {u}
          </SelectItem>
        ))}
        <SelectItem value="__custom__">Autre…</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ProductCombobox({
  organizationId,
  value,
  onChange,
}: {
  organizationId: string;
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: allProducts = [] } = useOrganizationProducts(organizationId);
  const products = allProducts.filter((p) => (p.product_type as string[] | null)?.includes("ingredient"));
  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-start text-sm font-normal">
          {selected ? selected.name : <span className="text-muted-foreground">Choisir un ingrédient…</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Aucun ingrédient trouvé.</CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 30).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id, p.name);
                    setOpen(false);
                  }}
                >
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SupplierCombobox({
  organizationId,
  value,
  onChange,
}: {
  organizationId: string;
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suppliers = [] } = useSuppliers(organizationId);
  const filtered = suppliers.filter(
    (s) => !s.deleted && (!search || s.name.toLowerCase().includes(search.toLowerCase())),
  );
  const selected = suppliers.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-start text-sm font-normal">
          {selected ? selected.name : <span className="text-muted-foreground">Choisir un fournisseur…</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Aucun fournisseur trouvé.</CommandEmpty>
            <CommandGroup>
              {filtered.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onChange(s.id, s.name);
                    setOpen(false);
                  }}
                >
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
