"use client";

import { useState } from "react";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAllSupplierReferences } from "@/lib/queries/supplier-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type MatchedProductSupplier = {
  id: string;
  productId: string | null;
  supplierId: string | null;
  ref: string | null;
  name: string | null;
  productName: string | null;
  supplierName: string | null;
  unitPrice: number | null;
  orderUnit: string | null;
  unitsPerPackage: number | null;
};

export function ProductSupplierCombobox({
  organizationId,
  value,
  onSelect,
  onCreateRequest,
}: {
  organizationId: string;
  value: string | null;
  onSelect: (ps: MatchedProductSupplier) => void;
  onCreateRequest: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: allPs = [] } = useAllSupplierReferences(organizationId);

  const filtered = allPs.filter((ps) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (ps.supplier_product_ref?.toLowerCase().includes(s) ?? false) ||
      (ps.product?.name.toLowerCase().includes(s) ?? false) ||
      (ps.supplier?.name.toLowerCase().includes(s) ?? false) ||
      (ps.supplier_product_name?.toLowerCase().includes(s) ?? false)
    );
  });

  const selected = value ? allPs.find((ps) => ps.id === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-[280px] justify-start truncate text-xs">
          {selected ? (
            <span className="truncate">
              {selected.product?.name} · {selected.supplier?.name}
              {selected.supplier_product_ref && ` · ${selected.supplier_product_ref}`}
            </span>
          ) : (
            <span className="text-muted-foreground">Associer un product supplier…</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Rechercher par réf, produit, fournisseur…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  setOpen(false);
                  onCreateRequest();
                }}
              >
                <PlusCircle className="h-4 w-4" /> Créer une nouvelle association
              </button>
            </CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 30).map((ps) => (
                <CommandItem
                  key={ps.id}
                  value={ps.id}
                  onSelect={() => {
                    onSelect({
                      id: ps.id,
                      productId: ps.product?.id ?? null,
                      supplierId: ps.supplier?.id ?? null,
                      ref: ps.supplier_product_ref,
                      name: ps.supplier_product_name,
                      productName: ps.product?.name ?? null,
                      supplierName: ps.supplier?.name ?? null,
                      unitPrice: ps.unit_price,
                      orderUnit: ps.order_unit,
                      unitsPerPackage: ps.conversion_factor,
                    });
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{ps.product?.name ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">
                      {ps.supplier?.name}
                      {ps.supplier_product_ref && ` · ${ps.supplier_product_ref}`}
                      {ps.unit_price != null &&
                        ` · ${eur.format(ps.unit_price)}${ps.order_unit ? `/${ps.order_unit}` : ""}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
              <CommandItem
                value="__create__"
                onSelect={() => {
                  setOpen(false);
                  onCreateRequest();
                }}
                className="text-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Créer une nouvelle association
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
