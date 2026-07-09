"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MenuProductPickerItem } from "@/lib/queries/public-menu-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function AddProductCombobox({
  picker,
  alreadyInSection,
  isPending,
  onAdd,
}: {
  picker: MenuProductPickerItem[];
  alreadyInSection: Set<string>;
  isPending: boolean;
  onAdd: (menusProductId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = picker.filter((p) => !alreadyInSection.has(p.menusProductId));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={isPending || available.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un produit
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" />
          <CommandList>
            <CommandEmpty>Aucun produit disponible.</CommandEmpty>
            <CommandGroup>
              {available.map((p) => (
                <CommandItem
                  key={p.menusProductId}
                  value={`${p.productName} ${p.menuName ?? ""}`}
                  onSelect={() => {
                    onAdd(p.menusProductId);
                    setOpen(false);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate">{p.productName}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {p.price != null ? eur.format(p.price) : "—"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
