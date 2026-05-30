"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEstablishmentVatRates } from "@/lib/queries/establishments";
import {
  OPTION_GROUPS_QUERY_KEY,
  useEstablishmentOptionGroups,
  type OptionGroupWithValues,
} from "@/lib/queries/product-option-groups-queries";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { GroupDialog, ValueDialog } from "./product-option-group-dialogs";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const SELECTION_LABELS: Record<string, string> = {
  unique: "Choix unique",
  unlimited: "Qté libre",
  limited: "Multiple limité",
};

export function ProductOptionGroupsConfig({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading } = useEstablishmentOptionGroups(establishmentId, organizationId);
  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroupWithValues | null>(null);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<Tables<"product_option_group_values"> | null>(null);
  const [targetGroup, setTargetGroup] = useState<OptionGroupWithValues | null>(null);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: [OPTION_GROUPS_QUERY_KEY, establishmentId] });

  const groupMutation = useMutation({
    mutationFn: async (payload: {
      mode: "insert" | "update";
      row: Partial<Tables<"product_option_groups">> & { id?: string };
    }) => {
      const supabase = createClient();
      if (payload.mode === "insert") {
        const { error } = await supabase.from("product_option_groups").insert({
          establishment_id: establishmentId,
          organization_id: organizationId,
          name: payload.row.name ?? "",
          selection_type: payload.row.selection_type ?? "unique",
          is_required: payload.row.is_required ?? false,
          max_selections: payload.row.max_selections ?? null,
          allow_quantity: payload.row.allow_quantity ?? false,
          auto_open_modal: payload.row.auto_open_modal ?? false,
          display_order: payload.row.display_order ?? 0,
          deleted: false,
        });
        if (error) throw error;
      } else if (payload.row.id) {
        const { error } = await supabase
          .from("product_option_groups")
          .update({
            name: payload.row.name,
            selection_type: payload.row.selection_type,
            is_required: payload.row.is_required,
            max_selections: payload.row.max_selections,
            allow_quantity: payload.row.allow_quantity,
            auto_open_modal: payload.row.auto_open_modal,
            display_order: payload.row.display_order,
          })
          .eq("id", payload.row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Groupe enregistré.");
      invalidate();
      setGroupDialogOpen(false);
      setEditingGroup(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("product_option_groups").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Groupe supprimé.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const valueMutation = useMutation({
    mutationFn: async (payload: {
      mode: "insert" | "update";
      groupId: string;
      row: Partial<Tables<"product_option_group_values">> & { id?: string };
    }) => {
      const supabase = createClient();
      if (payload.mode === "insert") {
        const { error } = await supabase.from("product_option_group_values").insert({
          option_group_id: payload.groupId,
          option_name: payload.row.option_name ?? "",
          option_value: payload.row.option_value ?? "",
          option_price: payload.row.option_price ?? 0,
          tva_rate: payload.row.tva_rate ?? 20,
          min_quantity: payload.row.min_quantity ?? null,
          max_quantity: payload.row.max_quantity ?? null,
          is_default: payload.row.is_default ?? false,
          is_visible: payload.row.is_visible ?? true,
          display_order: payload.row.display_order ?? 0,
          deleted: false,
        });
        if (error) throw error;
      } else if (payload.row.id) {
        const { error } = await supabase
          .from("product_option_group_values")
          .update({
            option_name: payload.row.option_name,
            option_value: payload.row.option_value,
            option_price: payload.row.option_price,
            tva_rate: payload.row.tva_rate,
            min_quantity: payload.row.min_quantity,
            max_quantity: payload.row.max_quantity,
            is_default: payload.row.is_default,
            is_visible: payload.row.is_visible,
            display_order: payload.row.display_order,
          })
          .eq("id", payload.row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Valeur enregistrée.");
      invalidate();
      setValueDialogOpen(false);
      setEditingValue(null);
      setTargetGroup(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const deleteValueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("product_option_group_values").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valeur supprimée.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec."),
  });

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Groupes d&apos;options</h1>
          <p className="text-muted-foreground text-sm">
            Définissez les options réutilisables de cet établissement, puis assignez-les aux produits.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGroup(null);
            setGroupDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nouveau groupe
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun groupe d&apos;options. Créez-en un pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => toggleExpanded(group.id)}
                  >
                    {expanded.has(group.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {SELECTION_LABELS[group.selection_type] ?? group.selection_type}
                    </Badge>
                    {group.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Obligatoire
                      </Badge>
                    )}
                    {group.allow_quantity && (
                      <Badge variant="secondary" className="text-xs">
                        Compteur
                      </Badge>
                    )}
                    <CardDescription className="text-xs">
                      {group.values.length} valeur{group.values.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-7 w-7"
                      disabled={deleteGroupMutation.isPending}
                      onClick={() => {
                        if (!confirm(`Supprimer le groupe "${group.name}" ?`)) return;
                        deleteGroupMutation.mutate(group.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expanded.has(group.id) && (
                <CardContent className="pt-0">
                  {group.values.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-sm">Aucune valeur. Ajoutez-en une ci-dessous.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Valeur</TableHead>
                          <TableHead className="text-right">Prix</TableHead>
                          <TableHead>TVA</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.values.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.option_name}</TableCell>
                            <TableCell>{v.option_value}</TableCell>
                            <TableCell className="text-right tabular-nums">{eur.format(v.option_price)}</TableCell>
                            <TableCell className="text-xs">{v.tva_rate}%</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingValue(v);
                                    setTargetGroup(group);
                                    setValueDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-7 w-7"
                                  disabled={deleteValueMutation.isPending}
                                  onClick={() => {
                                    if (!confirm(`Supprimer "${v.option_value}" ?`)) return;
                                    deleteValueMutation.mutate(v.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingValue(null);
                        setTargetGroup(group);
                        setValueDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une valeur
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={(o) => {
          setGroupDialogOpen(o);
          if (!o) setEditingGroup(null);
        }}
        initial={editingGroup}
        onSave={(row) =>
          groupMutation.mutate({
            mode: editingGroup ? "update" : "insert",
            row: editingGroup ? { ...row, id: editingGroup.id } : row,
          })
        }
        pending={groupMutation.isPending}
      />

      {targetGroup && (
        <ValueDialog
          key={editingValue?.id ?? `new-${targetGroup.id}`}
          open={valueDialogOpen}
          onOpenChange={(o) => {
            setValueDialogOpen(o);
            if (!o) {
              setEditingValue(null);
              setTargetGroup(null);
            }
          }}
          initial={editingValue}
          group={targetGroup}
          vatRates={vatRates}
          onSave={(row) =>
            valueMutation.mutate({
              mode: editingValue ? "update" : "insert",
              groupId: targetGroup.id,
              row: editingValue ? { ...row, id: editingValue.id } : row,
            })
          }
          pending={valueMutation.isPending}
        />
      )}
    </div>
  );
}
