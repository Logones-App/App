"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { useOrganizationProducts } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";
import { compositionLineCost } from "@/lib/utils/unit-conversion";

import type { WizardComposition, WizardData } from "./product-new-wizard";

function estimateCost(comp: WizardComposition): number | null {
  return compositionLineCost(comp.default_quantity, comp.quantity_unit, comp.unit_cost, comp.ingredient_portion_unit);
}

// ─── Formulaire ajout ingrédient existant ─────────────────────────────────────

function AddExistingForm({
  organizationId,
  usedIds,
  onAdd,
  onCancel,
}: {
  organizationId: string;
  usedIds: Set<string>;
  onAdd: (comp: WizardComposition) => void;
  onCancel: () => void;
}) {
  const { data: allProducts = [] } = useOrganizationProducts(organizationId);
  const ingredients = allProducts.filter(
    (p) => (p.product_type as string[] | null)?.includes("ingredient") && !usedIds.has(p.id),
  );
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");

  const selected = ingredients.find((p) => p.id === selectedId);

  const handleAdd = async () => {
    if (!selected || !qty) return;
    const supabase = createClient();

    // Préférer le prix du fournisseur préféré, sinon dernier prix connu
    const { data: prefSupplier } = await supabase
      .from("product_suppliers")
      .select("unit_price")
      .eq("product_id", selectedId)
      .eq("is_preferred", true)
      .eq("deleted", false)
      .not("unit_price", "is", null)
      .maybeSingle();

    let resolvedUnitCost: number | null = prefSupplier?.unit_price ?? null;
    if (resolvedUnitCost == null) {
      const { data: latest } = await supabase
        .from("product_purchase_price_history")
        .select("unit_cost")
        .eq("product_id", selectedId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedUnitCost = latest?.unit_cost ?? null;
    }

    const qtyNum = parseFloat(qty.replace(",", "."));
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Quantité invalide.");
      return;
    }
    onAdd({
      component_product_id: selected.id,
      component_name: selected.name,
      default_quantity: qtyNum,
      quantity_unit: unit,
      unit_cost: resolvedUnitCost,
      ingredient_portion_unit: selected.portion_unit ?? null,
    });
  };

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Ingrédient</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un ingrédient…" />
          </SelectTrigger>
          <SelectContent>
            {ingredients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.portion_unit ? ` (${p.portion_unit})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quantité pour cette recette</Label>
        <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="50" />
      </div>
      <div className="space-y-2">
        <Label>Unité</Label>
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PORTION_UNITS.map((u) => (
              <SelectItem key={u.key} value={u.key}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="button" size="sm" disabled={!selectedId || !qty} onClick={handleAdd}>
          Ajouter
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ─── Formulaire création rapide ingrédient ────────────────────────────────────

function QuickCreateForm({
  organizationId,
  onAdd,
  onCancel,
}: {
  organizationId: string;
  onAdd: (comp: WizardComposition) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [priceQty, setPriceQty] = useState("1");
  const [priceUnit, setPriceUnit] = useState("kg");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Le nom est requis.");
      const priceNum = parseFloat(price.replace(",", "."));
      const priceQtyNum = parseFloat(priceQty.replace(",", "."));
      if (!Number.isFinite(priceNum) || priceNum <= 0) throw new Error("Prix invalide.");
      if (!Number.isFinite(priceQtyNum) || priceQtyNum <= 0) throw new Error("Quantité de référence invalide.");

      const qtyNum = parseFloat(qty.replace(",", "."));
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) throw new Error("Quantité recette invalide.");

      const supabase = createClient();
      const unitCost = Math.round((priceNum / priceQtyNum) * 10000) / 10000;

      const { data: product, error: prodErr } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          category_id: null,
          price: 0,
          product_type: ["ingredient"],
          portion_weight: priceQtyNum,
          portion_unit: priceUnit,
          is_available: true,
          deleted: false,
        })
        .select("id")
        .single();
      if (prodErr) throw prodErr;

      await supabase.from("product_purchase_price_history").insert({
        product_id: product.id,
        organization_id: organizationId,
        unit_cost: unitCost,
        effective_from: new Date().toISOString().slice(0, 10),
        currency: "EUR",
      });

      return { id: product.id, unitCost, qtyNum };
    },
    onSuccess: ({ id, unitCost, qtyNum }) => {
      onAdd({
        component_product_id: id,
        component_name: name.trim(),
        default_quantity: qtyNum,
        quantity_unit: unit,
        unit_cost: unitCost,
        ingredient_portion_unit: priceUnit,
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible."),
  });

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-2">
      <p className="text-muted-foreground col-span-2 text-xs font-medium">Nouvel ingrédient</p>
      <div className="space-y-2 sm:col-span-2">
        <Label>Nom</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Beurre" autoFocus />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Prix d&apos;achat HT</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="10,00"
              className="pr-6 tabular-nums"
            />
            <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">€</span>
          </div>
          <span className="flex items-center text-sm">pour</span>
          <Input
            value={priceQty}
            onChange={(e) => setPriceQty(e.target.value)}
            inputMode="decimal"
            className="w-20 tabular-nums"
          />
          <Select value={priceUnit} onValueChange={setPriceUnit}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PORTION_UNITS.map((u) => (
                <SelectItem key={u.key} value={u.key}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Quantité pour cette recette</Label>
        <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="50" />
      </div>
      <div className="space-y-2">
        <Label>Unité</Label>
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PORTION_UNITS.map((u) => (
              <SelectItem key={u.key} value={u.key}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button
          type="button"
          size="sm"
          disabled={createMutation.isPending || !name.trim() || !price || !qty}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Création…" : "Créer & Ajouter"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

type FormMode = "none" | "existing" | "create";

export function Step5Ingredients({
  data,
  patch,
  organizationId,
}: {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  organizationId: string;
}) {
  const [mode, setMode] = useState<FormMode>("none");

  const usedIds = new Set(data.compositions.map((c) => c.component_product_id));

  const addComp = (comp: WizardComposition) => {
    patch({ compositions: [...data.compositions, comp] });
    setMode("none");
  };

  const removeComp = (id: string) =>
    patch({ compositions: data.compositions.filter((c) => c.component_product_id !== id) });

  const totalCost = data.compositions.reduce((sum, c) => {
    const cost = estimateCost(c);
    return cost != null ? sum + cost : sum;
  }, 0);

  const hasCostData = data.compositions.some((c) => estimateCost(c) != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingrédients de la recette</CardTitle>
        <CardDescription>
          Composants de cette recette avec leur quantité. Le coût matière est estimé à partir des prix d&apos;achat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.compositions.length > 0 && (
          <ul className="space-y-2">
            {data.compositions.map((comp) => {
              const cost = estimateCost(comp);
              return (
                <li
                  key={comp.component_product_id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 font-medium">{comp.component_name}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {comp.default_quantity} {comp.quantity_unit}
                  </Badge>
                  {cost != null ? (
                    <span className="text-muted-foreground shrink-0 tabular-nums">{cost.toFixed(4)} €</span>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-xs italic">coût inconnu</span>
                  )}
                  <button type="button" onClick={() => removeComp(comp.component_product_id)}>
                    <Trash2 className="text-destructive h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {hasCostData && (
          <div className="bg-muted/40 flex items-center justify-end gap-2 rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">Coût matière estimé :</span>
            <span className="font-semibold tabular-nums">{totalCost.toFixed(4)} € HT</span>
          </div>
        )}

        {mode === "existing" && (
          <AddExistingForm
            organizationId={organizationId}
            usedIds={usedIds}
            onAdd={addComp}
            onCancel={() => setMode("none")}
          />
        )}
        {mode === "create" && (
          <QuickCreateForm organizationId={organizationId} onAdd={addComp} onCancel={() => setMode("none")} />
        )}

        {mode === "none" && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMode("existing")}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un ingrédient
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setMode("create")}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un ingrédient
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
