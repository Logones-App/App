"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useEstablishmentCategories,
  useEstablishmentPrinters,
  useEstablishmentVatRates,
} from "@/lib/queries/establishments";
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
  category_id: string;
  display_order: number | null;
  is_available: boolean;
  printer_id: string;
  vat_rate_id: string;
};

function toFormDefaults(product: ProductWithCategoryName): ProductProprieteDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    category_id: product.category_id,
    display_order: product.display_order ?? 0,
    is_available: product.is_available ?? true,
    printer_id: product.printer_id ?? "__none__",
    vat_rate_id: product.vat_rate_id ?? "__none__",
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
  const { data: categories = [] } = useEstablishmentCategories(establishmentId, organizationId);
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);

  const form = useForm<ProductProprieteDraft>({
    defaultValues: toFormDefaults(product),
  });

  useEffect(() => {
    form.reset(toFormDefaults(product));
  }, [product, form]);

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
          category_id: values.category_id,
          display_order: values.display_order ?? null,
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

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ deleted: true })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit archivé.");
      invalidate();
      router.push(backHref);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Archivage impossible."),
  });

  const orphanPrinter = product.printer_id && !printers.some((p) => p.id === product.printer_id);
  const orphanVat = product.vat_rate_id && !vatRates.some((v) => v.id === product.vat_rate_id);

  return (
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
              <AlertDialogDescription>
                Il ne sera plus listé dans le catalogue actif. Les données liées en base (menus, commandes) restent
                selon vos règles métier.
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
                description: draft.description?.trim() ? draft.description : undefined,
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
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d&apos;affichage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
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
                    <FormLabel>TVA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Aucune</SelectItem>
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
  );
}
