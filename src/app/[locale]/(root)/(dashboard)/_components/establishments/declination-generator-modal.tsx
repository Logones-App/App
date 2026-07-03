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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import { useEstablishmentMenus } from "@/lib/queries/establishments-menu-queries";
import { useSupplierReferences } from "@/lib/queries/supplier-queries";
import { createClient } from "@/lib/supabase/client";

import {
  canGenerate,
  draftCost,
  estimateUnitCost,
  isDraftValid,
  parsePositive,
  suggestionsFromRefs,
  type Draft,
} from "./declination-generator-parts";

const NO_MENU = "__none__";
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type Ingredient = {
  id: string;
  name: string;
  category_id: string | null;
  vat_rate_id: string | null;
  portion_unit: string | null;
};

/** Crée un produit recette + son BOM (consomme l'ingrédient) + rattachement menu optionnel. */
async function createDeclination(
  supabase: ReturnType<typeof createClient>,
  args: {
    name: string;
    qty: number;
    price: number | null;
    ingredient: Ingredient;
    establishmentId: string;
    organizationId: string;
    portionUnit: string;
    menuId: string | null;
  },
) {
  const { name, qty, price, ingredient, establishmentId, organizationId, portionUnit, menuId } = args;
  const { data: prod, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name,
      category_id: ingredient.category_id,
      vat_rate_id: ingredient.vat_rate_id,
      product_type: ["recipe"],
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

  if (menuId && price != null) {
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
  showPrice,
  onChange,
  onRemove,
}: {
  draft: Draft;
  unitLabel: string;
  unitCost: number | null;
  showPrice: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const cost = draftCost(draft.qtyStr, unitCost);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Switch checked={draft.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
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
        {showPrice && (
          <div className="w-28 space-y-1">
            <Label className="text-xs">Prix de vente</Label>
            <Input
              value={draft.priceStr}
              onChange={(e) => onChange({ priceStr: e.target.value })}
              inputMode="decimal"
              placeholder="€"
              className="tabular-nums"
            />
          </div>
        )}
        {cost != null && <p className="text-muted-foreground pb-2 text-xs">coût matière ≈ {eur.format(cost)}</p>}
      </div>
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
        <CardTitle className="text-base">Décliner en vente</CardTitle>
        <CardDescription>
          Créez des produits vendables à partir de cette matière (au verre, à la bouteille, à la canette…). Chaque vente
          décrémente le stock dans son unité de gestion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Créer des déclinaisons
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
  const [menuId, setMenuId] = useState(NO_MENU);
  const [counter, setCounter] = useState(0);

  // Pré-remplissage : une déclinaison « conditionnement plein » par référence.
  useEffect(() => {
    if (seeded || refs.length === 0) return;
    const seeds = suggestionsFromRefs(refs).map((s) => ({
      id: s.key,
      name: `${ingredient.name} — ${s.label.toLowerCase()}`,
      qtyStr: String(s.qty),
      priceStr: "",
      enabled: true,
    }));
    setDrafts(seeds);
    setSeeded(true);
  }, [refs, seeded, ingredient.name]);

  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDraft = (id: string) => setDrafts((ds) => ds.filter((d) => d.id !== id));
  const addDraft = () => {
    setDrafts((ds) => [...ds, { id: `custom-${counter}`, name: "", qtyStr: "", priceStr: "", enabled: true }]);
    setCounter((c) => c + 1);
  };

  const usesMenu = menuId !== NO_MENU;

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const valid = drafts.filter(isDraftValid);
      for (const d of valid) {
        await createDeclination(supabase, {
          name: d.name.trim(),
          qty: parsePositive(d.qtyStr) as number,
          price: usesMenu ? parsePositive(d.priceStr) : null,
          ingredient,
          establishmentId,
          organizationId,
          portionUnit,
          menuId: usesMenu ? menuId : null,
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
          <div className="space-y-3">
            <div className="space-y-2">
              {drafts.map((d) => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  unitLabel={unitLabel}
                  unitCost={unitCost}
                  showPrice={usesMenu}
                  onChange={(patch) => patchDraft(d.id, patch)}
                  onRemove={() => removeDraft(d.id)}
                />
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDraft}>
                + Portion personnalisée
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Rattacher à un menu (optionnel)</Label>
              <Select value={menuId} onValueChange={setMenuId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MENU}>— Ne pas rattacher maintenant</SelectItem>
                  {menus.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usesMenu && (
                <p className="text-muted-foreground text-[11px]">
                  Les prix saisis créent le tarif dans ce menu. Sans menu, les produits sont créés et se tarifent plus
                  tard dans l&apos;éditeur de menu.
                </p>
              )}
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
