"use client";

import { useState } from "react";

import { Check, Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useActiveSuppliers,
  useCreateProductSupplier,
  useDeleteProductSupplier,
  useProductSuppliers,
  useUpdateProductSupplier,
  type ProductSupplierRow,
} from "@/lib/queries/supplier-queries";

type ProductSupplierWithName = ProductSupplierRow & {
  supplier: { id: string; name: string; is_active: boolean } | null;
};

// ─── Formulaire d'ajout ───────────────────────────────────────────────────────

type LinkForm = {
  supplier_id: string;
  supplier_product_ref: string;
  supplier_product_name: string;
  order_unit: string;
  order_quantity: string;
  lead_time_days: string;
  is_preferred: boolean;
  notes: string;
};

const emptyLink = (): LinkForm => ({
  supplier_id: "",
  supplier_product_ref: "",
  supplier_product_name: "",
  order_unit: "",
  order_quantity: "",
  lead_time_days: "",
  is_preferred: false,
  notes: "",
});

function AddSupplierForm({
  productId,
  organizationId,
  usedSupplierIds,
  onSuccess,
  onCancel,
}: {
  productId: string;
  organizationId: string;
  usedSupplierIds: Set<string>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<LinkForm>(emptyLink);
  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const available = suppliers.filter((s) => !usedSupplierIds.has(s.id));
  const createMutation = useCreateProductSupplier(productId);

  const patch = (key: keyof LinkForm, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.supplier_id) return;
    const qty = parseFloat(form.order_quantity.replace(",", "."));
    const days = parseInt(form.lead_time_days, 10);
    createMutation.mutate(
      {
        supplier_id: form.supplier_id,
        organization_id: organizationId,
        supplier_product_ref: form.supplier_product_ref || null,
        supplier_product_name: form.supplier_product_name || null,
        order_unit: form.order_unit || null,
        order_quantity: Number.isFinite(qty) && qty > 0 ? qty : null,
        lead_time_days: Number.isFinite(days) && days >= 0 ? days : null,
        is_preferred: form.is_preferred,
        notes: form.notes || null,
      },
      { onSuccess },
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Associer un fournisseur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {available.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tous les fournisseurs actifs sont déjà associés à ce produit.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Fournisseur *</Label>
                <Select value={form.supplier_id} onValueChange={(v) => patch("supplier_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un fournisseur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Réf. article fournisseur</Label>
                <Input
                  value={form.supplier_product_ref}
                  onChange={(e) => patch("supplier_product_ref", e.target.value)}
                  placeholder="EX-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom dans catalogue fournisseur</Label>
                <Input
                  value={form.supplier_product_name}
                  onChange={(e) => patch("supplier_product_name", e.target.value)}
                  placeholder="Nom chez le fournisseur"
                />
              </div>
              <div className="space-y-2">
                <Label>Unité de commande</Label>
                <Input
                  value={form.order_unit}
                  onChange={(e) => patch("order_unit", e.target.value)}
                  placeholder="kg, caisse 6x, carton…"
                />
              </div>
              <div className="space-y-2">
                <Label>Qté min. commande</Label>
                <Input
                  value={form.order_quantity}
                  onChange={(e) => patch("order_quantity", e.target.value)}
                  inputMode="decimal"
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Délai livraison (jours)</Label>
                <Input
                  value={form.lead_time_days}
                  onChange={(e) => patch("lead_time_days", e.target.value)}
                  inputMode="numeric"
                  placeholder="2"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="link-preferred"
                  checked={form.is_preferred}
                  onCheckedChange={(v) => patch("is_preferred", v)}
                />
                <Label htmlFor="link-preferred">Fournisseur préféré</Label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => patch("notes", e.target.value)}
                  placeholder="Conditions particulières…"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={createMutation.isPending || !form.supplier_id}
              >
                {createMutation.isPending ? "Enregistrement…" : "Associer"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Ligne liaison ────────────────────────────────────────────────────────────

function ProductSupplierTableRow({ row, productId }: { row: ProductSupplierWithName; productId: string }) {
  const updateMutation = useUpdateProductSupplier(productId);
  const deleteMutation = useDeleteProductSupplier(productId);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2 font-medium">
          {row.is_preferred && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
          {row.supplier?.name ?? "—"}
          {row.supplier && !row.supplier.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactif
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{row.supplier_product_ref ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {row.order_unit ? `${row.order_quantity ?? 1} ${row.order_unit}` : (row.order_quantity ?? "—")}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {row.lead_time_days != null ? `${row.lead_time_days} j` : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] truncate text-sm">{row.notes ?? "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={row.is_preferred ? "Retirer fournisseur préféré" : "Marquer comme préféré"}
            onClick={() => updateMutation.mutate({ id: row.id, patch: { is_preferred: !row.is_preferred } })}
          >
            <Star
              className={`h-3.5 w-3.5 ${row.is_preferred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={() => deleteMutation.mutate(row.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function ProductSuppliersPanel({ productId, organizationId }: { productId: string; organizationId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: links = [], isLoading } = useProductSuppliers(productId);

  const usedIds = new Set(links.map((l) => l.supplier_id));
  const preferred = links.find((l) => l.is_preferred);

  return (
    <div className="space-y-6">
      {preferred && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              Fournisseur préféré
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{preferred.supplier?.name}</p>
            {preferred.supplier_product_ref && (
              <p className="text-muted-foreground text-sm">Réf. {preferred.supplier_product_ref}</p>
            )}
            {preferred.lead_time_days != null && (
              <p className="text-muted-foreground text-sm">
                Délai : {preferred.lead_time_days} jour{preferred.lead_time_days > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fournisseurs associés</CardTitle>
          <CardDescription>
            Liste des fournisseurs pouvant approvisionner ce produit. L&apos;étoile ★ marque le fournisseur préféré
            utilisé en priorité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Réf. article</TableHead>
                  <TableHead>Unité / Qté min</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-16 text-center text-sm">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : links.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-16 text-center text-sm">
                      Aucun fournisseur associé.
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((row) => (
                    <ProductSupplierTableRow key={row.id} row={row as ProductSupplierWithName} productId={productId} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {showAdd ? (
            <AddSupplierForm
              productId={productId}
              organizationId={organizationId}
              usedSupplierIds={usedIds}
              onSuccess={() => setShowAdd(false)}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Associer un fournisseur
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
