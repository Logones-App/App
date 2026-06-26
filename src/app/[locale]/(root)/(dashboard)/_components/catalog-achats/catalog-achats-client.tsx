"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Star, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  allSupplierReferencesQueryKey,
  type CatalogReferenceRow,
  useAllSupplierReferences,
  useUpdateSupplierReference,
} from "@/lib/queries/supplier-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatPrice(row: CatalogReferenceRow): string {
  if (row.unit_price == null) return "—";
  return `${eur.format(row.unit_price)}${row.order_unit ? ` / ${row.order_unit}` : ""}`;
}

function filterRow(r: CatalogReferenceRow, search: string, supplierFilter: string): boolean {
  if (search) {
    const s = search.toLowerCase();
    const productMatch = r.product?.name.toLowerCase().includes(s) ?? false;
    const refMatch = r.supplier_product_ref?.toLowerCase().includes(s) ?? false;
    const nameMatch = r.supplier_product_name?.toLowerCase().includes(s) ?? false;
    if (!productMatch && !refMatch && !nameMatch) return false;
  }
  if (supplierFilter !== "__all__" && r.supplier_id !== supplierFilter) return false;
  return true;
}

// ─── Ligne en mode édition ─────────────────────────────────────────────────────

function RowEdit({
  row,
  organizationId,
  onDone,
}: {
  row: CatalogReferenceRow;
  organizationId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [refInput, setRefInput] = useState(row.supplier_product_ref ?? "");
  const [nameInput, setNameInput] = useState(row.supplier_product_name ?? "");
  const updateMutation = useUpdateSupplierReference(row.product_id);

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: row.id,
        patch: {
          supplier_product_ref: refInput.trim() || null,
          supplier_product_name: nameInput.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Référence mise à jour.");
          void queryClient.invalidateQueries({ queryKey: allSupplierReferencesQueryKey(organizationId) });
          onDone();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onDone();
  };

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="font-medium">{row.product?.name ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {row.is_preferred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          <span className="text-sm">{row.supplier?.name ?? "—"}</span>
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          placeholder="TG-12345"
          className="h-7 w-36 font-mono text-xs"
          autoFocus
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Désignation fournisseur"
          className="h-7 min-w-[14rem] text-xs"
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm tabular-nums">{formatPrice(row)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" className="h-7 px-2" onClick={handleSave} disabled={updateMutation.isPending}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDone}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Ligne en mode lecture ─────────────────────────────────────────────────────

function RowView({ row, onEdit }: { row: CatalogReferenceRow; onEdit: () => void }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.product?.name ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {row.is_preferred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          <span className="text-sm">{row.supplier?.name ?? "—"}</span>
          {row.supplier && !row.supplier.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactif
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {row.supplier_product_ref ? (
          <span className="font-mono text-sm">{row.supplier_product_ref}</span>
        ) : (
          <span className="text-muted-foreground text-sm italic">à renseigner</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{row.supplier_product_name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm tabular-nums">{formatPrice(row)}</TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function CatalogAchatsClient() {
  const organizationId = useOrgaUserOrganizationId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("__all__");

  const { data: rows = [], isLoading } = useAllSupplierReferences(organizationId ?? "");

  const suppliers = [
    ...new Map(rows.filter((r) => r.supplier).map((r) => [r.supplier!.id, r.supplier!])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const filtered = rows.filter((r) => filterRow(r, search, supplierFilter));
  const missingCount = filtered.filter((r) => !r.supplier_product_ref).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Catalogue achats</h1>
        <p className="text-muted-foreground text-sm">
          Références fournisseur par ingrédient — utilisées pour l&apos;import automatique de factures.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par produit, réf. ou désignation…"
          className="max-w-sm"
        />
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les fournisseurs</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {missingCount > 0 && (
          <Badge variant="outline" className="text-muted-foreground">
            {missingCount} référence{missingCount > 1 ? "s" : ""} manquante{missingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit / Ingrédient</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Réf. article</TableHead>
              <TableHead>Désignation fournisseur</TableHead>
              <TableHead>Prix d&apos;achat</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">
                  {rows.length === 0
                    ? "Associez des fournisseurs aux produits depuis la fiche ingrédient → onglet Achats."
                    : "Aucun résultat."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) =>
              editingId === row.id ? (
                <RowEdit
                  key={row.id}
                  row={row}
                  organizationId={organizationId ?? ""}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <RowView key={row.id} row={row} onEdit={() => setEditingId(row.id)} />
              ),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
