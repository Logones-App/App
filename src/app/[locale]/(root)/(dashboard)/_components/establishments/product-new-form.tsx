"use client";

import { useEffect, useMemo } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useEstablishmentCategories,
  useEstablishmentPrinters,
  useEstablishmentVatRates,
} from "@/lib/queries/establishments";
import { productCreateSchema, type ProductCreateParsed } from "@/lib/schemas/product-create-schema";
import { createClient } from "@/lib/supabase/client";

type ProductCreateDraft = {
  name: string;
  description: string;
  category_id: string;
  price: string;
  display_order: number | null;
  is_available: boolean;
  printer_id: string;
  vat_rate_id: string;
};

function emptyDefaults(firstCategoryId: string): ProductCreateDraft {
  return {
    name: "",
    description: "",
    category_id: firstCategoryId,
    price: "0",
    display_order: 0,
    is_available: true,
    printer_id: "__none__",
    vat_rate_id: "__none__",
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

  const firstCategoryId = categories[0]?.id ?? "";

  const form = useForm<ProductCreateDraft>({
    defaultValues: emptyDefaults(firstCategoryId),
  });

  useEffect(() => {
    if (firstCategoryId && !form.getValues("category_id")) {
      form.setValue("category_id", firstCategoryId);
    }
  }, [firstCategoryId, form]);

  const normalizedRedirectBase = useMemo(() => redirectBase.replace(/\/$/, ""), [redirectBase]);

  const createMutation = useMutation({
    mutationFn: async (values: ProductCreateParsed) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: values.name,
          description: values.description?.trim() ? values.description.trim() : null,
          category_id: values.category_id,
          price: values.price,
          display_order: values.display_order ?? null,
          is_available: values.is_available,
          printer_id: values.printer_id,
          vat_rate_id: values.vat_rate_id,
          deleted: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("Création sans identifiant produit.");
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
                createMutation.mutate(parsed.data);
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix catalogue (EUR)</FormLabel>
                      <FormControl>
                        <Input {...field} type="text" inputMode="decimal" className="tabular-nums" />
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
                      <FormLabel>TVA</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Aucune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune</SelectItem>
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
    </div>
  );
}
