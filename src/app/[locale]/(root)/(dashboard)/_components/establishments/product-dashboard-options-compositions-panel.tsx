"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrganizationProducts } from "@/lib/queries/establishments";
import type { CompositionStockRow, ProductCompositionRow } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { CompositionLineCatalogCard } from "./product-composition-dashboard-blocks";
import { ProductOptionDialog } from "./product-option-dialog";
import { ProductCompositionAddDialog, ProductCompositionEditDialog } from "./product-panel-dialogs";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const DASHBOARD_KEY = "product-establishment-dashboard" as const;

function mutationErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: string; details?: string | null; hint?: string | null }).message;
    const d = (e as { details?: string | null }).details;
    const h = (e as { hint?: string | null }).hint;
    const parts = [m, d, h].filter((x): x is string => Boolean(x && String(x).trim()));
    if (parts.length) return parts.join(" — ");
  }
  return "Échec.";
}

function throwPostgrestError(
  context: string,
  error: { message?: string; details?: string | null; hint?: string | null },
) {
  const parts = [error.message, error.details, error.hint].filter((x): x is string => Boolean(x && String(x).trim()));
  throw new Error(parts.length ? `${context} : ${parts.join(" — ")}` : context);
}

/** Aligné sur product_compositions_supplement_price_xor_check : un seul mode de prix (supplément ou multiplicateur). */
function normalizeCompositionSupplementXor(
  unit_supplement_price: number | null | undefined,
  price_multiplier: number | null | undefined,
): { unit_supplement_price: number | null; price_multiplier: number | null } {
  const usp = unit_supplement_price ?? null;
  const pm = price_multiplier ?? null;
  if (usp !== null && pm !== null) {
    return { unit_supplement_price: usp, price_multiplier: null };
  }
  return { unit_supplement_price: usp, price_multiplier: pm };
}

function invalidateDashboard(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  establishmentId: string,
  organizationId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: [DASHBOARD_KEY, productId, establishmentId, organizationId],
  });
}

export function ProductOptionsAndCompositionsPanel({
  options,
  compositionStockRows,
  productId,
  establishmentId,
  organizationId,
}: {
  options: Tables<"product_options">[];
  compositionStockRows: CompositionStockRow[];
  productId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const { data: orgProducts = [] } = useOrganizationProducts(organizationId);

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Tables<"product_options"> | null>(null);

  const [compositionDialogOpen, setCompositionDialogOpen] = useState(false);
  const [editingComposition, setEditingComposition] = useState<ProductCompositionRow | null>(null);
  const [addCompositionOpen, setAddCompositionOpen] = useState(false);

  const optionMutation = useMutation({
    mutationFn: async (payload: {
      mode: "insert" | "update";
      row: Partial<Tables<"product_options">> & { id?: string };
    }) => {
      const supabase = createClient();
      if (payload.mode === "insert") {
        const { error } = await supabase.from("product_options").insert({
          product_id: productId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          option_group: payload.row.option_group ?? null,
          option_name: payload.row.option_name ?? "",
          option_value: payload.row.option_value ?? "",
          option_price: payload.row.option_price ?? 0,
          tva_rate: payload.row.tva_rate ?? 20,
          selection_type: payload.row.selection_type ?? "single",
          display_order: payload.row.display_order ?? 0,
          is_visible: payload.row.is_visible ?? true,
          is_required: payload.row.is_required ?? false,
          is_default: payload.row.is_default ?? false,
          deleted: false,
        });
        if (error) throwPostgrestError("Insertion option", error);
      } else if (payload.row.id) {
        const {
          id,
          option_group,
          option_name,
          option_value,
          option_price,
          tva_rate,
          selection_type,
          display_order,
          is_visible,
          is_required,
          is_default,
        } = payload.row;
        const { error } = await supabase
          .from("product_options")
          .update({
            option_group: option_group ?? null,
            option_name,
            option_value,
            option_price,
            tva_rate,
            selection_type,
            display_order,
            is_visible,
            is_required,
            is_default,
          })
          .eq("id", id);
        if (error) throwPostgrestError("Mise à jour option", error);
      }
    },
    onSuccess: () => {
      toast.success("Option enregistrée.");
      invalidateDashboard(queryClient, productId, establishmentId, organizationId);
      setOptionDialogOpen(false);
      setEditingOption(null);
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const optionDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_options").update({ deleted: true }).eq("id", id);
      if (error) throwPostgrestError("Suppression option", error);
    },
    onSuccess: () => {
      toast.success("Option désactivée.");
      invalidateDashboard(queryClient, productId, establishmentId, organizationId);
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const compositionMutation = useMutation({
    mutationFn: async (payload: { mode: "insert" | "update"; row: Partial<Tables<"product_compositions">> }) => {
      const supabase = createClient();
      const pricing = normalizeCompositionSupplementXor(
        payload.row.unit_supplement_price,
        payload.row.price_multiplier,
      );
      if (payload.mode === "insert") {
        const { error } = await supabase.from("product_compositions").insert({
          main_product_id: productId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          component_product_id: payload.row.component_product_id as string,
          composition_kind: payload.row.composition_kind ?? "recipe",
          default_quantity: payload.row.default_quantity ?? 1,
          max_quantity: payload.row.max_quantity ?? null,
          display_order: payload.row.display_order ?? 0,
          unit_supplement_price: pricing.unit_supplement_price,
          price_multiplier: pricing.price_multiplier,
          show_in_customization: payload.row.show_in_customization ?? false,
          is_required: payload.row.is_required ?? false,
          deleted: false,
        });
        if (error) throwPostgrestError("Insertion composition", error);
      } else if (payload.row.id) {
        const {
          id,
          composition_kind,
          default_quantity,
          max_quantity,
          display_order,
          show_in_customization,
          is_required,
        } = payload.row;
        const { error } = await supabase
          .from("product_compositions")
          .update({
            composition_kind,
            default_quantity,
            max_quantity,
            display_order,
            unit_supplement_price: pricing.unit_supplement_price,
            price_multiplier: pricing.price_multiplier,
            show_in_customization,
            is_required,
          })
          .eq("id", id);
        if (error) throwPostgrestError("Mise à jour composition", error);
      }
    },
    onSuccess: () => {
      toast.success("Composition enregistrée.");
      invalidateDashboard(queryClient, productId, establishmentId, organizationId);
      setCompositionDialogOpen(false);
      setAddCompositionOpen(false);
      setEditingComposition(null);
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const compositionDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_compositions").update({ deleted: true }).eq("id", id);
      if (error) throwPostgrestError("Suppression composition", error);
    },
    onSuccess: () => {
      toast.success("Composition désactivée.");
      invalidateDashboard(queryClient, productId, establishmentId, organizationId);
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const nextOptionOrder = options.length ? Math.max(...options.map((o) => o.display_order)) + 1 : 0;
  const nextCompositionOrder = compositionStockRows.length
    ? Math.max(...compositionStockRows.map((r) => r.composition.display_order ?? 0)) + 1
    : 0;

  const candidateComponents = orgProducts.filter((p) => p.id !== productId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Options</CardTitle>
            <CardDescription>
              Paramètres d&apos;options pour ce produit dans cet établissement (perso caisse).
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingOption(null);
              setOptionDialogOpen(true);
            }}
          >
            Ajouter une option
          </Button>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune option configurée pour cet établissement.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Groupe</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>TVA</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.option_group ?? "—"}</TableCell>
                      <TableCell className="font-medium">{o.option_name}</TableCell>
                      <TableCell>{o.option_value}</TableCell>
                      <TableCell className="tabular-nums">{eur.format(o.option_price)}</TableCell>
                      <TableCell>{o.tva_rate}%</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{o.selection_type}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {o.is_visible === false && <Badge variant="secondary">Masqué</Badge>}
                          {o.is_required && <Badge variant="outline">Obligatoire</Badge>}
                          {o.is_default && <Badge variant="outline">Défaut</Badge>}
                          {o.is_visible !== false && !o.is_required && !o.is_default && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingOption(o);
                              setOptionDialogOpen(true);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={optionDeleteMutation.isPending}
                            onClick={() => {
                              if (confirm("Désactiver cette option ?")) optionDeleteMutation.mutate(o.id);
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Compositions</CardTitle>
            <CardDescription>
              Lignes <span className="font-medium">product_compositions</span> : recette, modificateurs et affichage
              modale.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddCompositionOpen(true)}>
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {compositionStockRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune composition pour ce produit à cet établissement.</p>
          ) : (
            compositionStockRows.map(({ composition: row, isSelfComposition }) => (
              <div key={row.id} className="space-y-2">
                <CompositionLineCatalogCard row={row} isSelfComposition={isSelfComposition} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingComposition(row);
                      setCompositionDialogOpen(true);
                    }}
                  >
                    Modifier
                  </Button>
                  {!isSelfComposition ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={compositionDeleteMutation.isPending}
                      onClick={() => {
                        if (confirm("Désactiver cette ligne de composition ?"))
                          compositionDeleteMutation.mutate(row.id);
                      }}
                    >
                      Supprimer
                    </Button>
                  ) : (
                    <p className="text-muted-foreground max-w-md text-right text-xs">
                      La ligne « article / unité » n&apos;est pas supprimable ici.
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ProductOptionDialog
        key={editingOption?.id ?? "new-option"}
        open={optionDialogOpen}
        onOpenChange={(o) => {
          setOptionDialogOpen(o);
          if (!o) setEditingOption(null);
        }}
        initial={editingOption}
        defaultDisplayOrder={editingOption ? editingOption.display_order : nextOptionOrder}
        onSave={(row) =>
          optionMutation.mutate({
            mode: editingOption ? "update" : "insert",
            row: editingOption ? { ...row, id: editingOption.id } : row,
          })
        }
        pending={optionMutation.isPending}
      />

      <ProductCompositionEditDialog
        key={editingComposition?.id ?? "no-composition"}
        open={compositionDialogOpen}
        onOpenChange={(o) => {
          setCompositionDialogOpen(o);
          if (!o) setEditingComposition(null);
        }}
        row={editingComposition}
        onSave={(patch) => {
          if (editingComposition) {
            compositionMutation.mutate({ mode: "update", row: { ...patch, id: editingComposition.id } });
          }
        }}
        pending={compositionMutation.isPending}
      />

      <ProductCompositionAddDialog
        open={addCompositionOpen}
        onOpenChange={setAddCompositionOpen}
        candidateComponents={candidateComponents}
        defaultDisplayOrder={nextCompositionOrder}
        onSave={(row) => compositionMutation.mutate({ mode: "insert", row })}
        pending={compositionMutation.isPending}
      />
    </div>
  );
}
