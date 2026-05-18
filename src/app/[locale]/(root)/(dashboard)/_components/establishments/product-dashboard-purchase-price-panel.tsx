"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ProductWithCategoryName } from "@/lib/queries/product-establishment-dashboard";
import {
  getCurrentPurchasePrice,
  useAddPurchasePrice,
  useDeletePurchasePrice,
  useProductPurchasePriceHistory,
} from "@/lib/queries/purchase-price-queries";
import { useActiveSuppliers } from "@/lib/queries/supplier-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type AddFormState = {
  unit_cost: string;
  effective_from: string;
  supplier_id: string;
  supplier_ref: string;
  notes: string;
};

const emptyForm = (): AddFormState => ({
  unit_cost: "",
  effective_from: todayIso(),
  supplier_id: "",
  supplier_ref: "",
  notes: "",
});

export function ProductPurchasePricePanel({
  product,
  organizationId,
}: {
  product: ProductWithCategoryName;
  organizationId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddFormState>(emptyForm);

  const { data: history = [], isLoading } = useProductPurchasePriceHistory(product.id, organizationId);
  const { data: suppliers = [] } = useActiveSuppliers(organizationId);
  const addMutation = useAddPurchasePrice(product.id, organizationId);
  const deleteMutation = useDeletePurchasePrice(product.id, organizationId);

  const current = getCurrentPurchasePrice(history);

  const patch = (key: keyof AddFormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = () => {
    const cost = parseFloat(form.unit_cost.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) return;
    addMutation.mutate(
      {
        unit_cost: Math.round(cost * 10000) / 10000,
        effective_from: form.effective_from || todayIso(),
        supplier_id: form.supplier_id || undefined,
        supplier_ref: form.supplier_ref,
        notes: form.notes,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm(emptyForm());
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Résumé courant */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prix d&apos;achat actuel</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {current ? eur.format(current.unit_cost) : <span className="text-muted-foreground text-lg">—</span>}
            </p>
            {current && (
              <p className="text-muted-foreground mt-1 text-xs">
                Depuis le {format(parseISO(current.effective_from), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Marge par menu</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Consultez l&apos;onglet <span className="font-medium">Marge</span> pour voir les marges calculées par menu
              TTC.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des prix d&apos;achat</CardTitle>
          <CardDescription>
            Chaque entrée représente un prix fournisseur en vigueur à partir d&apos;une date. Le prix courant est la
            ligne la plus récente dont la date est passée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>En vigueur depuis</TableHead>
                  <TableHead className="text-right">Prix unitaire HT</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-16 text-center text-sm">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-16 text-center text-sm">
                      Aucun prix d&apos;achat enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((row, idx) => {
                    const isCurrent = idx === 0 || row.id === current?.id;
                    return (
                      <TableRow key={row.id} className={isCurrent && current ? "bg-muted/20" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(parseISO(row.effective_from), "d MMM yyyy", { locale: fr })}
                            {isCurrent && current?.id === row.id && (
                              <Badge variant="secondary" className="text-xs">
                                actuel
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {eur.format(row.unit_cost)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {suppliers.find((s) => s.id === (row as { supplier_id?: string | null }).supplier_id)?.name ??
                            row.supplier_ref ??
                            "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                          {row.notes ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => deleteMutation.mutate(row.id)}
                            disabled={deleteMutation.isPending}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Formulaire d'ajout */}
          {showForm ? (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Nouveau prix d&apos;achat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pp-cost">Prix unitaire HT (EUR) *</Label>
                    <Input
                      id="pp-cost"
                      autoFocus
                      value={form.unit_cost}
                      onChange={(e) => patch("unit_cost", e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="tabular-nums"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-date">En vigueur depuis *</Label>
                    <Input
                      id="pp-date"
                      type="date"
                      value={form.effective_from}
                      onChange={(e) => patch("effective_from", e.target.value)}
                    />
                  </div>
                  {suppliers.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="pp-supplier">Fournisseur</Label>
                      <Select value={form.supplier_id || undefined} onValueChange={(v) => patch("supplier_id", v)}>
                        <SelectTrigger id="pp-supplier">
                          <SelectValue placeholder="Sélectionner…" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="pp-ref">Réf. fournisseur</Label>
                    <Input
                      id="pp-ref"
                      value={form.supplier_ref}
                      onChange={(e) => patch("supplier_ref", e.target.value)}
                      placeholder="EX-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-notes">Notes</Label>
                    <Textarea
                      id="pp-notes"
                      value={form.notes}
                      onChange={(e) => patch("notes", e.target.value)}
                      rows={2}
                      placeholder="Tarif négocié, promo, etc."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAdd}
                    disabled={addMutation.isPending || !form.unit_cost}
                  >
                    {addMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setForm(emptyForm());
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un prix d&apos;achat
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
