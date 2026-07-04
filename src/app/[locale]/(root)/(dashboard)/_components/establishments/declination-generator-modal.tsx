"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import { useEstablishmentMenus } from "@/lib/queries/establishments-menu-queries";
import { useSupplierReferences } from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import {
  canGenerate,
  draftCost,
  estimateUnitCost,
  isDraftValid,
  parsePositive,
  suggestionsFromRefs,
  type Draft,
} from "./declination-generator-parts";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type Ingredient = {
  id: string;
  name: string;
  category_id: string | null;
  vat_rate_id: string | null;
  portion_unit: string | null;
};

/** Crée un produit recette (vendable) + son BOM (consomme l'ingrédient) + un tarif par menu. */
async function createDeclination(
  supabase: ReturnType<typeof createClient>,
  args: {
    name: string;
    qty: number;
    ingredient: Ingredient;
    establishmentId: string;
    organizationId: string;
    portionUnit: string;
    menuPrices: { menuId: string; price: number }[];
  },
) {
  const { name, qty, ingredient, establishmentId, organizationId, portionUnit, menuPrices } = args;
  const { data: prod, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name,
      category_id: ingredient.category_id,
      vat_rate_id: ingredient.vat_rate_id,
      product_type: ["recipe", "sellable"],
      // La vente décrémente l'ingrédient (matière) via la fiche technique.
      stock_mode: "ingredients",
      is_available: true,
      deleted: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  const recipeId = prod.id;

  const { error: cErr } = await supabase.from("product_compositions").insert({
    main_product_id: recipeId,
    component_product_id: ingredient.id,
    composition_kind: "recipe",
    default_quantity: qty,
    quantity_unit: portionUnit,
    affects_stock: true,
    establishment_id: establishmentId,
    organization_id: organizationId,
    is_required: false,
    deleted: false,
  });
  if (cErr) throw cErr;

  // Un rattachement menu + tarif par menu (une déclinaison peut être vendue sur N menus).
  for (const { menuId, price } of menuPrices) {
    const { data: mp, error: mErr } = await supabase
      .from("menus_products")
      .insert({
        establishment_id: establishmentId,
        menus_id: menuId,
        products_id: recipeId,
        organization_id: organizationId,
        price,
      })
      .select("id")
      .single();
    if (mErr) throw mErr;
    await insertMenusProductPriceHistoryRow(supabase, mp.id, price, "product_dashboard");
  }
}

function DraftRow({
  draft,
  unitLabel,
  unitCost,
  menus,
  onChange,
  onRemove,
  onPrice,
}: {
  draft: Draft;
  unitLabel: string;
  unitCost: number | null;
  menus: { id: string; name: string }[];
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
  onPrice: (menuId: string, value: string) => void;
}) {
  const cost = draftCost(draft.qtyStr, unitCost);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nom du produit vendu"
          className="flex-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 pl-9">
        <div className="w-28 space-y-1">
          <Label className="text-xs">Consomme</Label>
          <div className="flex items-center gap-1">
            <Input
              value={draft.qtyStr}
              onChange={(e) => onChange({ qtyStr: e.target.value })}
              inputMode="decimal"
              className="tabular-nums"
            />
            <span className="text-muted-foreground text-xs">{unitLabel}</span>
          </div>
        </div>
        {cost != null && <p className="text-muted-foreground pb-2 text-xs">coût matière ≈ {eur.format(cost)}</p>}
      </div>
      {menus.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 pl-9">
          {menus.map((m) => (
            <div key={m.id} className="w-28 space-y-1">
              <Label className="text-xs">{m.name}</Label>
              <Input
                value={draft.prices[m.id] ?? ""}
                onChange={(e) => onPrice(m.id, e.target.value)}
                inputMode="decimal"
                placeholder="€"
                className="tabular-nums"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Carte « Décliner en vente » sur la fiche d'un ingrédient (matière). */
export function DeclinationGeneratorCard({
  ingredient,
  establishmentId,
  organizationId,
}: {
  ingredient: Ingredient;
  establishmentId: string;
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Créer des produits à partir de cet ingrédient</CardTitle>
        <CardDescription>
          Créez des produits vendables à partir de cette matière (au verre, à la bouteille, à la canette…). Chaque vente
          décrémente le stock dans son unité de gestion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Créer des produits
        </Button>
      </CardContent>
      {open && (
        <DeclinationGeneratorModal
          ingredient={ingredient}
          establishmentId={establishmentId}
          organizationId={organizationId}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

export function DeclinationGeneratorModal({
  ingredient,
  establishmentId,
  organizationId,
  onClose,
}: {
  ingredient: Ingredient;
  establishmentId: string;
  organizationId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: refs = [] } = useSupplierReferences(ingredient.id);
  const { data: menus = [] } = useEstablishmentMenus(establishmentId, organizationId);
  const portionUnit = ingredient.portion_unit ?? "";
  const unitCost = estimateUnitCost(refs);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [counter, setCounter] = useState(0);

  // Pré-remplissage : une déclinaison « conditionnement plein » par référence.
  useEffect(() => {
    if (seeded || refs.length === 0) return;
    const seeds = suggestionsFromRefs(refs).map((s) => ({
      id: s.key,
      name: `${ingredient.name} — ${s.label.toLowerCase()}`,
      qtyStr: String(s.qty),
      prices: {},
    }));
    setDrafts(seeds);
    setSeeded(true);
  }, [refs, seeded, ingredient.name]);

  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const setPrice = (id: string, menuId: string, value: string) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, prices: { ...d.prices, [menuId]: value } } : d)));
  const removeDraft = (id: string) => setDrafts((ds) => ds.filter((d) => d.id !== id));
  const addDraft = () => {
    setDrafts((ds) => [...ds, { id: `custom-${counter}`, name: "", qtyStr: "", prices: {} }]);
    setCounter((c) => c + 1);
  };
  const toggleMenu = (menuId: string) =>
    setSelectedMenuIds((ids) => (ids.includes(menuId) ? ids.filter((i) => i !== menuId) : [...ids, menuId]));

  // Menus retenus (id + nom) pour lesquels on saisit un prix par déclinaison.
  const selectedMenus = menus
    .filter((m) => selectedMenuIds.includes(m.id))
    .map((m) => ({ id: m.id, name: m.name ?? "Menu" }));

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const valid = drafts.filter(isDraftValid);
      for (const d of valid) {
        const menuPrices = selectedMenuIds
          // eslint-disable-next-line security/detect-object-injection
          .map((menuId) => ({ menuId, price: parsePositive(d.prices[menuId] ?? "") }))
          .filter((mp): mp is { menuId: string; price: number } => mp.price != null);
        await createDeclination(supabase, {
          name: d.name.trim(),
          qty: parsePositive(d.qtyStr) as number,
          ingredient,
          establishmentId,
          organizationId,
          portionUnit,
          menuPrices,
        });
      }
      return valid.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} déclinaison${n > 1 ? "s" : ""} créée${n > 1 ? "s" : ""}.`);
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["establishment-menus", establishmentId, organizationId] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la création."),
  });

  const unitLabel = portionUnit === "piece" ? "pièce" : portionUnit;
  const canSubmit = portionUnit !== "" && canGenerate(drafts) && !mutation.isPending;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Décliner « {ingredient.name} » en vente</DialogTitle>
          <DialogDescription>
            Crée des produits vendables (verre, bouteille, canette…) qui consomment cette matière. Le stock est
            décrémenté dans l&apos;unité de gestion à chaque vente.
          </DialogDescription>
        </DialogHeader>

        {portionUnit === "" ? (
          <p className="text-muted-foreground text-sm">
            Définissez d&apos;abord l&apos;unité de gestion de l&apos;ingrédient (onglet Stock) avant de le décliner.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-xs">Vendre sur quels menus ?</Label>
              {menus.length === 0 ? (
                <p className="text-muted-foreground text-[11px]">
                  Aucun menu — les produits seront créés sans tarif (à ajouter plus tard dans l&apos;éditeur de menu).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {menus.map((m) => {
                    const on = selectedMenuIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMenu(m.id)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedMenuIds.length > 0 && (
                <p className="text-muted-foreground text-[11px]">
                  Saisis un prix par menu sur chaque déclinaison. Colonne vide = pas de tarif sur ce menu.
                </p>
              )}
            </div>

            <div className="space-y-2">
              {drafts.map((d) => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  unitLabel={unitLabel}
                  unitCost={unitCost}
                  menus={selectedMenus}
                  onChange={(patch) => patchDraft(d.id, patch)}
                  onRemove={() => removeDraft(d.id)}
                  onPrice={(menuId, value) => setPrice(d.id, menuId, value)}
                />
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDraft}>
                + Portion personnalisée
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Création…" : "Créer les déclinaisons"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
