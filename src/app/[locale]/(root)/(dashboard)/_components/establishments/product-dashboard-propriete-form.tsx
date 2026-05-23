"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  PORTION_UNITS,
  type AllergenKey,
  type LabelKey,
  type ProductTypeKey,
} from "@/lib/constants/product-attributes";
import { useEstablishmentPrinters, useEstablishmentVatRates } from "@/lib/queries/establishments";
import type { ProductWithCategoryName } from "@/lib/queries/product-establishment-dashboard";
import {
  productCatalogProprieteSchema,
  type ProductCatalogProprieteParsed,
} from "@/lib/schemas/product-catalog-propriete-schema";
import { createClient } from "@/lib/supabase/client";

const DASHBOARD_KEY = "product-establishment-dashboard" as const;

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

export function ProductProprieteForm({
  product,
  productId,
  organizationId,
  establishmentId,
  backHref,
}: {
  product: ProductWithCategoryName;
  productId: string;
  organizationId: string;
  establishmentId: string;
  backHref: string;
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

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [DASHBOARD_KEY, productId, establishmentId, organizationId],
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
          product_type: productTypes,
          portion_weight: Number.isFinite(pw) && pw > 0 ? pw : null,
          portion_unit: portionUnit || null,
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

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();

      const [{ error: prodErr }, { error: gridErr }, { error: mpErr }, { error: compErr }] = await Promise.all([
        supabase.from("products").update({ deleted: true }).eq("id", productId).eq("organization_id", organizationId),
        supabase.from("category_grid_items").update({ deleted: true }).eq("product_id", productId),
        supabase
          .from("menus_products")
          .update({ deleted: true })
          .eq("products_id", productId)
          .eq("organization_id", organizationId),
        supabase
          .from("product_compositions")
          .update({ deleted: true })
          .eq("component_product_id", productId)
          .eq("organization_id", organizationId)
          .eq("deleted", false),
      ]);

      if (prodErr) throw prodErr;
      if (gridErr) throw gridErr;
      if (mpErr) throw mpErr;
      if (compErr) throw compErr;
    },
    onSuccess: () => {
      toast.success("Produit archivé.");
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["menu-category-grid-items"] });
      void queryClient.invalidateQueries({ queryKey: ["menu-products"] });
      void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
      router.push(backHref);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Archivage impossible."),
  });

  const { data: recipeUsageCount = 0 } = useQuery({
    queryKey: ["product-component-usage", productId, organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_compositions")
        .select("main_product_id")
        .eq("component_product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw error;
      return new Set(data.map((r) => r.main_product_id)).size;
    },
    enabled: !!productId && !!organizationId,
  });

  const orphanPrinter = product.printer_id && !printers.some((p) => p.id === product.printer_id);
  const orphanVat = product.vat_rate_id && !vatRates.some((v) => v.id === product.vat_rate_id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Propriété</CardTitle>
            <CardDescription>Données catalogue du produit (niveau organisation)</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="text-destructive border-destructive/40">
                Archiver le produit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archiver ce produit ?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>Il ne sera plus listé dans le catalogue actif.</p>
                    {recipeUsageCount > 0 && (
                      <p className="text-destructive font-medium">
                        ⚠ Cet ingrédient est utilisé dans {recipeUsageCount} recette
                        {recipeUsageCount > 1 ? "s" : ""}. Ces références seront supprimées des fiches techniques.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={archiveMutation.isPending}
                  onClick={() => archiveMutation.mutate()}
                >
                  {archiveMutation.isPending ? "Archivage…" : "Archiver"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
            const isIngredientOnly = productTypes.includes("ingredient") && !productTypes.includes("recipe");
            return (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type de produit{" "}
                    <span className="text-muted-foreground text-xs font-normal">(plusieurs possibles)</span>
                  </label>
                  <ProductTypePicker value={productTypes} onChange={setProductTypes} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Référence interne (SKU)</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="EX-001" />
                </div>
                {isIngredientOnly ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Unité d&apos;achat{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        (référence pour le prix HT — ex : kg, L)
                      </span>
                    </label>
                    <Select
                      value={portionUnit || "__none__"}
                      onValueChange={(v) => setPortionUnit(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Aucune" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Aucune</SelectItem>
                        {PORTION_UNITS.map((u) => (
                          <SelectItem key={u.key} value={u.key}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            <label className="text-sm font-medium">Labels</label>
            <LabelPicker value={labels} onChange={setLabels} />
            {labels.length > 0 && (
              <div className="mt-2">
                <LabelBadges labels={labels} />
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={() => updateCharacteristicsMutation.mutate()}
            disabled={updateCharacteristicsMutation.isPending}
          >
            {updateCharacteristicsMutation.isPending ? "Enregistrement…" : "Enregistrer les caractéristiques"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
