"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AllergenPicker,
  LabelPicker,
  PortionInput,
  ProductTypePicker,
} from "@/components/ui/product-attribute-pickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AllergenKey, LabelKey, ProductTypeKey } from "@/lib/constants/product-attributes";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import {
  useEstablishmentCategories,
  useEstablishmentMenus,
  useEstablishmentPrinters,
  useEstablishmentVatRates,
} from "@/lib/queries/establishments";
import { productCreateSchema, type ProductCreateParsed } from "@/lib/schemas/product-create-schema";
import { createClient } from "@/lib/supabase/client";

import { MenuPricesCard } from "./product-new-form-menu-prices";

type ProductCreateDraft = {
  name: string;
  description: string;
  category_id: string;
  purchase_price: string;
  display_order: number | null;
  is_available: boolean;
  printer_id: string;
  vat_rate_id: string;
};

function emptyDefaults(firstCategoryId: string, firstVatRateId: string): ProductCreateDraft {
  return {
    name: "",
    description: "",
    category_id: firstCategoryId,
    purchase_price: "",
    display_order: 0,
    is_available: true,
    printer_id: "__none__",
    vat_rate_id: firstVatRateId,
  };
}

export function ProductNewForm({
  establishmentId,
  organizationId,
  backHref,
  redirectBase,
}: {
  establishmentId: string;
  organizationId: string;
  /** Lien retour liste (sans `/new`) */
  backHref: string;
  /** Même base que `backHref` : après création on redirige vers `${redirectBase}/${id}` */
  redirectBase: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: catLoading } = useEstablishmentCategories(establishmentId, organizationId);
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);
  const { data: menus = [] } = useEstablishmentMenus(establishmentId, organizationId);

  // Prix par menu : { [menuId]: string } — vide = non configuré
  const [menuPrices, setMenuPrices] = useState<Record<string, string>>({});

  // Nouveaux attributs produit
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);
  const [labels, setLabels] = useState<LabelKey[]>([]);
  const [productType, setProductType] = useState<ProductTypeKey | null>(null);
  const [portionWeight, setPortionWeight] = useState("");
  const [portionUnit, setPortionUnit] = useState("");
  const [sku, setSku] = useState("");
  const [foodCostTarget, setFoodCostTarget] = useState("");

  const firstCategoryId = categories[0]?.id ?? "";
  const firstVatRateId = vatRates[0]?.id ?? "";

  const form = useForm<ProductCreateDraft>({
    defaultValues: emptyDefaults(firstCategoryId, firstVatRateId),
  });

  useEffect(() => {
    if (firstCategoryId && !form.getValues("category_id")) {
      form.setValue("category_id", firstCategoryId);
    }
  }, [firstCategoryId, form]);

  useEffect(() => {
    if (firstVatRateId && !form.getValues("vat_rate_id")) {
      form.setValue("vat_rate_id", firstVatRateId);
    }
  }, [firstVatRateId, form]);

  const normalizedRedirectBase = useMemo(() => redirectBase.replace(/\/$/, ""), [redirectBase]);

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      purchasePrice,
      menuPriceEntries,
      extras,
    }: {
      values: ProductCreateParsed;
      purchasePrice: number | null;
      menuPriceEntries: { menuId: string; price: number }[];
      extras: {
        allergens: string[];
        labels: string[];
        product_type: string | null;
        portion_weight: number | null;
        portion_unit: string | null;
        sku: string | null;
        food_cost_target: number | null;
      };
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: values.name,
          description: values.description?.trim() ? values.description.trim() : null,
          category_id: values.category_id,
          price: 0,
          display_order: values.display_order ?? null,
          is_available: values.is_available,
          printer_id: values.printer_id,
          vat_rate_id: values.vat_rate_id,
          deleted: false,
          allergens: extras.allergens,
          labels: extras.labels,
          product_type: extras.product_type,
          portion_weight: extras.portion_weight,
          portion_unit: extras.portion_unit,
          sku: extras.sku,
          food_cost_target: extras.food_cost_target,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("Création sans identifiant produit.");

      if (purchasePrice != null && purchasePrice > 0) {
        await supabase.from("product_purchase_price_history").insert({
          product_id: data.id,
          organization_id: organizationId,
          unit_cost: purchasePrice,
          effective_from: new Date().toISOString().slice(0, 10),
          currency: "EUR",
        });
      }

      // Pré-configurer les prix par menu (sans toucher à la grille)
      for (const entry of menuPriceEntries) {
        const { data: inserted, error: mpErr } = await supabase
          .from("menus_products")
          .insert({
            menus_id: entry.menuId,
            products_id: data.id,
            establishment_id: establishmentId,
            organization_id: organizationId,
            price: entry.price,
            deleted: false,
          })
          .select("id")
          .single();
        if (mpErr) throw mpErr;
        if (inserted?.id) {
          await insertMenusProductPriceHistoryRow(supabase, inserted.id, entry.price, "product_creation");
        }
      }

      return data.id;
    },
    onSuccess: (newId) => {
      toast.success("Produit créé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      router.push(`${normalizedRedirectBase}/${newId}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible."),
  });

  if (catLoading) {
    return <div className="text-muted-foreground p-12 text-sm">Chargement des catégories…</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Création impossible</CardTitle>
            <CardDescription>
              Créez au moins une catégorie depuis la page Produits de cet établissement (bouton « Nouvelle catégorie »)
              avant d&apos;ajouter un produit.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouveau produit</h1>
        <p className="text-muted-foreground text-sm">
          Le produit est créé au niveau organisation. Après enregistrement, vous accédez à la fiche (établissement
          courant) pour options, compositions et menus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations catalogue</CardTitle>
          <CardDescription>Nom, catégorie, prix de base et paramètres optionnels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit((draft) => {
                const parsed = productCreateSchema.safeParse({
                  ...draft,
                  description: draft.description?.trim() ? draft.description : undefined,
                });
                if (!parsed.success) {
                  const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
                  toast.error(typeof first === "string" ? first : "Données invalides.");
                  return;
                }
                const rawCost = (draft as { purchase_price?: string }).purchase_price?.replace(",", "") ?? "";
                const purchasePrice = rawCost ? parseFloat(rawCost.replace(",", ".")) : null;

                const menuPriceEntries = Object.entries(menuPrices)
                  .map(([menuId, raw]) => {
                    const n = parseFloat(raw.replace(",", "."));
                    return { menuId, price: Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null };
                  })
                  .filter((e): e is { menuId: string; price: number } => e.price !== null);

                const pw = parseFloat(portionWeight.replace(",", "."));
                const fct = parseFloat(foodCostTarget.replace(",", ".").replace("%", "")) / 100;
                createMutation.mutate({
                  values: parsed.data,
                  purchasePrice:
                    purchasePrice != null && Number.isFinite(purchasePrice) && purchasePrice > 0
                      ? Math.round(purchasePrice * 10000) / 10000
                      : null,
                  menuPriceEntries,
                  extras: {
                    allergens,
                    labels,
                    product_type: productType,
                    portion_weight: Number.isFinite(pw) && pw > 0 ? pw : null,
                    portion_unit: portionUnit || null,
                    sku: sku.trim() || null,
                    food_cost_target:
                      Number.isFinite(fct) && fct > 0 && fct <= 1 ? Math.round(fct * 10000) / 10000 : null,
                  },
                });
              })}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prix d&apos;achat HT initial{" "}
                        <span className="text-muted-foreground font-normal">(optionnel)</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="text" inputMode="decimal" className="tabular-nums" placeholder="0,00" />
                      </FormControl>
                      <p className="text-muted-foreground text-xs">
                        Utilisé pour calculer la marge dans la fiche technique.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordre d&apos;affichage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value === null || field.value === undefined ? "" : String(field.value)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(raw === "" ? null : Number(raw));
                          }}
                        />
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
                        <Textarea {...field} value={field.value ?? ""} rows={3} />
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
                          <SelectItem value="__none__">Aucune</SelectItem>
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Caractéristiques</CardTitle>
          <CardDescription>Type, portion, référence, allergènes et labels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de produit</label>
              <ProductTypePicker value={productType} onChange={setProductType} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Référence interne (SKU)</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="EX-001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Poids / volume de la portion</label>
              <PortionInput
                weight={portionWeight}
                unit={portionUnit}
                onWeightChange={setPortionWeight}
                onUnitChange={setPortionUnit}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Food cost cible <span className="text-muted-foreground font-normal">(optionnel)</span>
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
              <p className="text-muted-foreground text-xs">Alerte si le coût matière réel dépasse ce ratio.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Allergènes <span className="text-muted-foreground text-xs font-normal">(cliquer pour activer)</span>
            </label>
            <AllergenPicker value={allergens} onChange={setAllergens} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Labels <span className="text-muted-foreground text-xs font-normal">(cliquer pour activer)</span>
            </label>
            <LabelPicker value={labels} onChange={setLabels} />
          </div>
        </CardContent>
      </Card>

      {menus.length > 0 && <MenuPricesCard menus={menus} menuPrices={menuPrices} setMenuPrices={setMenuPrices} />}
    </div>
  );
}
