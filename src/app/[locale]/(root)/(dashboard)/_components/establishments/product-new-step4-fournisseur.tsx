"use client";

import { useState } from "react";

import { Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useActiveSuppliers } from "@/lib/queries/supplier-queries";

import type { WizardData, WizardSupplierLink } from "./product-new-wizard";

const emptyLink = (): WizardSupplierLink => ({
  supplier_id: "",
  supplier_name: "",
  supplier_product_ref: "",
  supplier_product_name: "",
  order_unit: "",
  order_quantity: "",
  lead_time_days: "",
  is_preferred: false,
  notes: "",
  unit_price: "",
});

export function Step4Fournisseur({
  data,
  patch,
  organizationId,
}: {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  organizationId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyLink);
  const { data: suppliers = [] } = useActiveSuppliers(organizationId);

  const usedIds = new Set(data.supplier_links.map((l) => l.supplier_id));
  const available = suppliers.filter((s) => !usedIds.has(s.id));

  const patchForm = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = () => {
    if (!form.supplier_id) return;
    patch({ supplier_links: [...data.supplier_links, { ...form }] });
    setForm(emptyLink);
    setShowForm(false);
  };

  const handleRemove = (supplierId: string) =>
    patch({ supplier_links: data.supplier_links.filter((l) => l.supplier_id !== supplierId) });

  const togglePreferred = (supplierId: string) =>
    patch({
      supplier_links: data.supplier_links.map((l) => ({
        ...l,
        is_preferred: l.supplier_id === supplierId ? !l.is_preferred : false,
      })),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fournisseur</CardTitle>
        <CardDescription>Associez un ou plusieurs fournisseurs. Optionnel à la création.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.supplier_links.length > 0 && (
          <ul className="space-y-2">
            {data.supplier_links.map((link) => (
              <li key={link.supplier_id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                <button
                  type="button"
                  onClick={() => togglePreferred(link.supplier_id)}
                  title={link.is_preferred ? "Retirer préféré" : "Marquer préféré"}
                >
                  <Star
                    className={`h-4 w-4 ${link.is_preferred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
                <span className="min-w-0 flex-1 font-medium">{link.supplier_name}</span>
                {link.unit_price && (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{link.unit_price} € HT</span>
                )}
                {link.supplier_product_ref && (
                  <span className="text-muted-foreground shrink-0 text-xs">Réf. {link.supplier_product_ref}</span>
                )}
                {link.order_unit && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {link.order_quantity || "1"} {link.order_unit}
                  </Badge>
                )}
                <button type="button" onClick={() => handleRemove(link.supplier_id)}>
                  <Trash2 className="text-destructive h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {showForm ? (
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Fournisseur *</Label>
              <Select
                value={form.supplier_id}
                onValueChange={(v) => {
                  const found = suppliers.find((s) => s.id === v);
                  setForm((prev) => ({ ...prev, supplier_id: v, supplier_name: found?.name ?? "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
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
                onChange={(e) => patchForm("supplier_product_ref", e.target.value)}
                placeholder="EX-12345"
              />
            </div>
            <div className="space-y-2">
              <Label>Unité de commande</Label>
              <Input
                value={form.order_unit}
                onChange={(e) => patchForm("order_unit", e.target.value)}
                placeholder="kg, caisse 6x…"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Prix unitaire HT{" "}
                <span className="text-muted-foreground text-xs font-normal">(pour 1 {form.order_unit || "unité"})</span>
              </Label>
              <div className="relative">
                <Input
                  value={form.unit_price}
                  onChange={(e) => patchForm("unit_price", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-6 tabular-nums"
                />
                <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Qté min. commande</Label>
              <Input
                value={form.order_quantity}
                onChange={(e) => patchForm("order_quantity", e.target.value)}
                inputMode="decimal"
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Délai livraison (jours)</Label>
              <Input
                value={form.lead_time_days}
                onChange={(e) => patchForm("lead_time_days", e.target.value)}
                inputMode="numeric"
                placeholder="2"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="link-preferred"
                checked={form.is_preferred}
                onCheckedChange={(v) => patchForm("is_preferred", v)}
              />
              <Label htmlFor="link-preferred">Fournisseur préféré</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => patchForm("notes", e.target.value)}
                placeholder="Conditions particulières…"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" size="sm" disabled={!form.supplier_id} onClick={handleAdd}>
                Ajouter
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : available.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Associer un fournisseur
          </Button>
        ) : (
          data.supplier_links.length > 0 && (
            <p className="text-muted-foreground text-sm">Tous les fournisseurs actifs sont déjà associés.</p>
          )
        )}

        {suppliers.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun fournisseur actif. Créez-en depuis la gestion des fournisseurs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
