"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationProducts } from "@/lib/queries/establishments";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type CompositionStockRow,
  type ProductCompositionRow,
} from "@/lib/queries/product-establishment-dashboard";
import {
  OPTION_GROUPS_QUERY_KEY,
  PRODUCT_OPTION_ASSIGNMENTS_QUERY_KEY,
  useEstablishmentOptionGroups,
  useProductOptionAssignments,
} from "@/lib/queries/product-option-groups-queries";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { CompositionLineCatalogCard } from "./product-composition-dashboard-blocks";
import { ProductCompositionAddDialog, ProductCompositionEditDialog } from "./product-panel-dialogs";

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

function normalizeCompositionSupplementXor(
  unit_supplement_price: number | null | undefined,
  price_multiplier: number | null | undefined,
): { unit_supplement_price: number | null; price_multiplier: number | null } {
  const usp = unit_supplement_price ?? null;
  const pm = price_multiplier ?? null;
  if (usp !== null && pm !== null) return { unit_supplement_price: usp, price_multiplier: null };
  return { unit_supplement_price: usp, price_multiplier: pm };
}

function invalidateDashboard(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  establishmentId: string,
  organizationId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
  });
}

const SELECTION_LABELS: Record<string, string> = {
  unique: "Choix unique",
  unlimited: "Qté libre",
  limited: "Multiple limité",
};

export function ProductOptionsAndCompositionsPanel({
  compositionStockRows,
  productId,
  establishmentId,
  organizationId,
}: {
  compositionStockRows: CompositionStockRow[];
  productId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const params = useParams<{ locale?: string; id?: string }>();
  const locale = params.locale ?? "";
  const optionsHref = `/${locale}/dashboard/establishments/${establishmentId}/options`;

  const { data: orgProducts = [] } = useOrganizationProducts(organizationId);
  const { data: allGroups = [] } = useEstablishmentOptionGroups(establishmentId, organizationId);
  const { data: assignments = [] } = useProductOptionAssignments(productId);

  const assignedGroupIds = new Set(assignments.map((a) => a.option_group_id));
  const availableGroups = allGroups.filter((g) => !assignedGroupIds.has(g.id));

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [compositionDeleteTarget, setCompositionDeleteTarget] = useState<string | null>(null);
  const [compositionDialogOpen, setCompositionDialogOpen] = useState(false);
  const [editingComposition, setEditingComposition] = useState<ProductCompositionRow | null>(null);
  const [addCompositionOpen, setAddCompositionOpen] = useState(false);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: [PRODUCT_OPTION_ASSIGNMENTS_QUERY_KEY, productId] });
    void queryClient.invalidateQueries({ queryKey: [OPTION_GROUPS_QUERY_KEY, establishmentId] });
    invalidateDashboard(queryClient, productId, establishmentId, organizationId);
  };

  const assignMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await createClient()
        .from("product_option_group_products")
        .insert({ product_id: productId, option_group_id: groupId, display_order: assignments.length });
      if (error) throwPostgrestError("Assignation du groupe", error);
    },
    onSuccess: () => {
      toast.success("Groupe assigné.");
      setSelectedGroupId("");
      invalidateAll();
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("product_option_group_products").delete().eq("id", id);
      if (error) throwPostgrestError("Retrait du groupe", error);
    },
    onSuccess: () => {
      toast.success("Groupe retiré.");
      invalidateAll();
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
        const { error } = await supabase
          .from("product_compositions")
          .update({
            composition_kind: payload.row.composition_kind,
            default_quantity: payload.row.default_quantity,
            max_quantity: payload.row.max_quantity,
            display_order: payload.row.display_order,
            unit_supplement_price: pricing.unit_supplement_price,
            price_multiplier: pricing.price_multiplier,
            show_in_customization: payload.row.show_in_customization,
            is_required: payload.row.is_required,
          })
          .eq("id", payload.row.id);
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
      const { error } = await createClient().from("product_compositions").update({ deleted: true }).eq("id", id);
      if (error) throwPostgrestError("Suppression composition", error);
    },
    onSuccess: () => {
      toast.success("Composition désactivée.");
      invalidateDashboard(queryClient, productId, establishmentId, organizationId);
    },
    onError: (e) => toast.error(mutationErrorMessage(e)),
  });

  const modifierRows = compositionStockRows.filter((r) => r.composition.composition_kind === "modifier");
  const nextCompositionOrder = modifierRows.length
    ? Math.max(...modifierRows.map((r) => r.composition.display_order ?? 0)) + 1
    : 0;
  const candidateComponents = orgProducts.filter((p) => p.id !== productId);

  return (
    <div className="space-y-6">
      {/* Options — groupes assignés */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Options</CardTitle>
            <CardDescription>
              Groupes d&apos;options assignés à ce produit (cuisson, taille, suppléments…).
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={optionsHref}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Gérer les groupes
            </a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun groupe assigné. Assignez-en un ci-dessous ou{" "}
              <a href={optionsHref} className="underline underline-offset-2">
                créez des groupes
              </a>{" "}
              dans la configuration.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => {
                const g = a.group;
                if (!g) return null;
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {SELECTION_LABELS[g.selection_type] ?? g.selection_type}
                      </Badge>
                      {g.is_required && (
                        <Badge variant="destructive" className="text-xs">
                          Obligatoire
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {g.values.length} valeur{g.values.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 px-2"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        if (!confirm(`Retirer "${g.name}" de ce produit ?`)) return;
                        removeMutation.mutate(a.id);
                      }}
                    >
                      Retirer
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {availableGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="max-w-[18rem]">
                  <SelectValue placeholder="Choisir un groupe à assigner…" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedGroupId || assignMutation.isPending}
                onClick={() => {
                  if (selectedGroupId) assignMutation.mutate(selectedGroupId);
                }}
              >
                {assignMutation.isPending ? "…" : "Assigner"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suppléments — compositions modifier */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Suppléments</CardTitle>
            <CardDescription>
              Extras ajoutés à la commande (steak supplémentaire, ingrédient additionnel…).
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddCompositionOpen(true)}>
            Ajouter un supplément
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {modifierRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun supplément configuré pour cet établissement.</p>
          ) : (
            modifierRows.map(({ composition: row, isSelfComposition }) => (
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={compositionDeleteMutation.isPending}
                    onClick={() => setCompositionDeleteTarget(row.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ProductCompositionEditDialog
        key={editingComposition?.id ?? "no-composition"}
        open={compositionDialogOpen}
        onOpenChange={(o) => {
          setCompositionDialogOpen(o);
          if (!o) setEditingComposition(null);
        }}
        row={editingComposition}
        onSave={(patch) => {
          if (editingComposition)
            compositionMutation.mutate({ mode: "update", row: { ...patch, id: editingComposition.id } });
        }}
        pending={compositionMutation.isPending}
      />

      <ProductCompositionAddDialog
        open={addCompositionOpen}
        onOpenChange={setAddCompositionOpen}
        candidateComponents={candidateComponents}
        defaultDisplayOrder={nextCompositionOrder}
        defaultKind="modifier"
        onSave={(row) => compositionMutation.mutate({ mode: "insert", row })}
        pending={compositionMutation.isPending}
      />

      <AlertDialog
        open={compositionDeleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setCompositionDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Désactiver cette ligne de composition ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (compositionDeleteTarget) compositionDeleteMutation.mutate(compositionDeleteTarget);
                setCompositionDeleteTarget(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
