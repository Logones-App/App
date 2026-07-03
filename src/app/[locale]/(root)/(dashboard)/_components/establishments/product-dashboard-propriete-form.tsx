"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AllergenPicker,
  LabelBadges,
  LabelPicker,
  PortionInput,
  ProductTypePicker,
} from "@/components/ui/product-attribute-pickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type AllergenKey, type LabelKey, type ProductTypeKey } from "@/lib/constants/product-attributes";
import { useEstablishmentPrinters, useEstablishmentVatRates } from "@/lib/queries/establishments";
import { useProductTypeGuard, useRestoreProduct, type ProductTypeGuard } from "@/lib/queries/product-archive";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import {
  productCatalogProprieteSchema,
  type ProductCatalogProprieteParsed,
} from "@/lib/schemas/product-catalog-propriete-schema";
import { createClient } from "@/lib/supabase/client";

import { ArchiveProductDialog } from "./archive-product-dialog";
import { OriginPicker } from "./product-origin-picker";

type ProductProprieteDraft = {
  name: string;
  description: string;
  is_available: boolean;
  printer_id: string;
  vat_rate_id: string;
};

function toFormDefaults(product: ProductWithCategoryName): ProductProprieteDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    is_available: product.is_available ?? true,
    printer_id: product.printer_id ?? "__none__",
    vat_rate_id: product.vat_rate_id ?? "",
  };
}

// Contrôle d'un changement de type : bloque les retraits dangereux, avertit pour Recette+BOM.
function validateTypeChange(
  oldTypes: string[],
  newTypes: string[],
  guard: ProductTypeGuard | undefined,
): { block: string } | { warn: string } | null {
  if (newTypes.length === 0) return { block: "Sélectionnez au moins un type de produit." };
  const removed = oldTypes.filter((t) => !newTypes.includes(t));
  if (removed.length === 0) return null; // ajouts seulement → libre
  if (!guard) return { block: "Vérification en cours, réessayez dans un instant." };

  if (removed.includes("ingredient")) {
    if (guard.componentRecipes.length > 0) {
      const list = guard.componentRecipes.slice(0, 5).join(", ");
      const more = guard.componentRecipes.length > 5 ? "…" : "";
      return { block: `Impossible de retirer « Ingrédient » : utilisé dans ${list}${more}.` };
    }
    if (guard.hasActiveStock) {
      return {
        block: "Impossible de retirer « Ingrédient » : des lots de stock sont actifs. Soldez le stock d'abord.",
      };
    }
  }

  const wasForSale = oldTypes.includes("sellable");
  const nowForSale = newTypes.includes("sellable");
  if (wasForSale && !nowForSale && guard.onMenuOrFormula) {
    return { block: "Impossible : ce produit est présent sur des menus ou des formules. Retirez-le d'abord." };
  }

  if (removed.includes("recipe") && guard.hasBom) {
    return {
      warn: "Cette recette a une fiche technique (BOM). En retirant « Recette », le BOM sera conservé mais inactif. Continuer ?",
    };
  }
  return null;
}

export function ProductProprieteForm({
  product,
  productId,
  organizationId,
  establishmentId,
  backHref,
  stockUnit = null,
}: {
  product: ProductWithCategoryName;
  productId: string;
  organizationId: string;
  establishmentId: string;
  backHref: string;
  /** Unité de stock réelle (product_stocks.unit) si un stock existe — verrouille le champ unité. */
  stockUnit?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);

  const form = useForm<ProductProprieteDraft>({
    defaultValues: toFormDefaults(product),
  });

  useEffect(() => {
    form.reset(toFormDefaults(product));
  }, [product, form]);

  // État des caractéristiques (initialisé depuis le produit)
  const [allergens, setAllergens] = useState<AllergenKey[]>(() => (product.allergens as AllergenKey[] | null) ?? []);
  const [labels, setLabels] = useState<LabelKey[]>(() => (product.labels as LabelKey[] | null) ?? []);
  const [productTypes, setProductTypes] = useState<ProductTypeKey[]>(
    () => (product.product_type as ProductTypeKey[] | null) ?? [],
  );
  const [portionWeight, setPortionWeight] = useState(() =>
    product.portion_weight != null ? String(product.portion_weight) : "",
  );
  const [portionUnit, setPortionUnit] = useState(() => product.portion_unit ?? "");
  const [sku, setSku] = useState(() => product.sku ?? "");
  const [foodCostTarget, setFoodCostTarget] = useState(() =>
    product.food_cost_target != null ? String(Math.round(product.food_cost_target * 100)) : "",
  );
  const [origins, setOrigins] = useState<string[]>(() => (product.origins as string[] | null) ?? []);

  const isIngredientOnly = productTypes.includes("ingredient") && !productTypes.includes("recipe");

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
    void queryClient.invalidateQueries({
      queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (values: ProductCatalogProprieteParsed) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({
          name: values.name,
          description: values.description?.trim() ? values.description.trim() : null,
          is_available: values.is_available,
          printer_id: values.printer_id,
          vat_rate_id: values.vat_rate_id,
        })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit mis à jour.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement."),
  });

  const updateCharacteristicsMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const pw = parseFloat(portionWeight.replace(",", "."));
      const fct = parseFloat(foodCostTarget.replace(",", ".").replace("%", "")) / 100;
      const { error } = await supabase
        .from("products")
        .update({
          allergens,
          labels,
          origins,
          product_type: productTypes,
          portion_weight: Number.isFinite(pw) && pw > 0 ? pw : null,
          // Ingrédient : l'unité est gouvernée par product_stocks.unit (définie à la 1ère réception).
          // Recette : portion_unit = unité du poids de portion vendue (éditable ici).
          portion_unit: isIngredientOnly ? (stockUnit ?? portionUnit ?? null) : (portionUnit ?? null),
          sku: sku.trim() || null,
          food_cost_target: Number.isFinite(fct) && fct > 0 && fct <= 1 ? Math.round(fct * 10000) / 10000 : null,
        })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caractéristiques mises à jour.");
      invalidate();
    },
    onError: () => toast.error("Échec de l'enregistrement."),
  });

  const [archiveOpen, setArchiveOpen] = useState(false);

  const restoreMutation = useRestoreProduct(organizationId, () => {
    invalidate();
  });

  const { data: typeGuard } = useProductTypeGuard(productId, organizationId);

  const handleSaveCharacteristics = () => {
    const oldTypes = (product.product_type as string[] | null) ?? [];
    const result = validateTypeChange(oldTypes, productTypes, typeGuard);
    if (result && "block" in result) {
      toast.error(result.block);
      return;
    }
    if (result && "warn" in result && !confirm(result.warn)) return;
    updateCharacteristicsMutation.mutate();
  };

  const orphanPrinter = product.printer_id && !printers.some((p) => p.id === product.printer_id);
  const orphanVat = product.vat_rate_id && !vatRates.some((v) => v.id === product.vat_rate_id);

  return (
    <div className="space-y-6">
      {product.deleted && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              Ce produit est archivé et n&apos;est plus listé dans le catalogue actif.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(productId)}
            >
              {restoreMutation.isPending ? "Restauration…" : "Restaurer le produit"}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Propriété</CardTitle>
            <CardDescription>Données catalogue du produit (niveau organisation)</CardDescription>
          </div>
          {!product.deleted && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40"
                onClick={() => setArchiveOpen(true)}
              >
                Archiver le produit
              </Button>
              <ArchiveProductDialog
                productId={productId}
                productName={product.name}
                organizationId={organizationId}
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                onArchived={() => {
                  invalidate();
                  router.push(backHref);
                }}
              />
            </>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((draft) => {
                const parsed = productCatalogProprieteSchema.safeParse({
                  ...draft,
                  description: draft.description.trim() ? draft.description : undefined,
                });
                if (!parsed.success) {
                  const msg = parsed.error.flatten().fieldErrors;
                  const first = Object.values(msg).flat()[0];
                  toast.error(typeof first === "string" ? first : "Données invalides.");
                  return;
                }
                updateMutation.mutate(parsed.data);
              })}
              className="space-y-6"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel>Disponible</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="printer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imprimante</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Aucune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Défaut</SelectItem>
                          {orphanPrinter && product.printer_id ? (
                            <SelectItem value={product.printer_id}>Référence actuelle (liste indisponible)</SelectItem>
                          ) : null}
                          {printers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name ?? p.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vat_rate_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        TVA <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un taux…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {orphanVat && product.vat_rate_id ? (
                            <SelectItem value={product.vat_rate_id}>Référence actuelle (liste indisponible)</SelectItem>
                          ) : null}
                          {vatRates.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name ?? `${v.value ?? 0} %`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Caractéristiques</CardTitle>
          <CardDescription>Type, portion, allergènes et labels. Sauvegardés indépendamment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            return (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type de produit{" "}
                    <span className="text-muted-foreground text-xs font-normal">(plusieurs possibles)</span>
                  </label>
                  <ProductTypePicker value={productTypes} onChange={setProductTypes} />
                  <label className="flex items-center gap-2 pt-1 text-sm">
                    <Switch
                      checked={productTypes.includes("sellable")}
                      onCheckedChange={(v) =>
                        setProductTypes((prev) => (v ? [...prev, "sellable"] : prev.filter((k) => k !== "sellable")))
                      }
                    />
                    En vente{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (affiche les prix et menus — indépendant du fait d&apos;avoir une recette)
                    </span>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Référence interne (SKU)</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="EX-001" />
                </div>
                {isIngredientOnly ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Unité de gestion du stock{" "}
                      <span className="text-muted-foreground text-xs font-normal">(lecture seule)</span>
                    </label>
                    {stockUnit ? (
                      <div className="space-y-1">
                        <Input
                          value={stockUnit === "piece" ? "pièce" : stockUnit}
                          disabled
                          readOnly
                          className="bg-muted/50"
                        />
                        <p className="text-muted-foreground text-xs">
                          Définie par le stock — pour la changer, soldez le stock (onglet <strong>Stock</strong>).
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground rounded-md border border-dashed p-2.5 text-sm">
                        Sera définie à la <strong>première réception</strong> (onglet Achats).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Poids de la portion vendue</label>
                    <PortionInput
                      weight={portionWeight}
                      unit={portionUnit}
                      onWeightChange={setPortionWeight}
                      onUnitChange={setPortionUnit}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Food cost cible{" "}
                    <span className="text-muted-foreground text-xs font-normal">(ratio coût/vente)</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={foodCostTarget}
                      onChange={(e) => setFoodCostTarget(e.target.value)}
                      inputMode="decimal"
                      placeholder="30"
                      className="pr-8 tabular-nums"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Allergènes <span className="text-muted-foreground text-xs font-normal">(actifs en rouge)</span>
            </label>
            <AllergenPicker value={allergens} onChange={setAllergens} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Origine <span className="text-muted-foreground text-xs font-normal">(pays de production)</span>
            </label>
            <OriginPicker value={origins} onChange={setOrigins} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Labels</label>
            <LabelPicker value={labels} onChange={setLabels} />
            {labels.length > 0 && (
              <div className="mt-2">
                <LabelBadges labels={labels} />
              </div>
            )}
          </div>

          <Button type="button" onClick={handleSaveCharacteristics} disabled={updateCharacteristicsMutation.isPending}>
            {updateCharacteristicsMutation.isPending ? "Enregistrement…" : "Enregistrer les caractéristiques"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
