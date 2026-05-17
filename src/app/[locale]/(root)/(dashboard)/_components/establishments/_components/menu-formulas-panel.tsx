"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMenuFormulas } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { MenuFormulaCompositionSheet } from "./menu-formula-composition-sheet";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

export function MenuFormulasPanel({
  menuId,
  establishmentId,
  organizationId,
}: {
  menuId: string;
  establishmentId: string;
  organizationId: string;
}) {
  const t = useTranslations("establishments.menus_page");
  const queryClient = useQueryClient();
  const { data: formulas = [], isLoading, isError } = useMenuFormulas(menuId, establishmentId, organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"formulas"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"formulas"> | null>(null);
  const [compositionFormula, setCompositionFormula] = useState<Tables<"formulas"> | null>(null);

  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("0");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const nextDisplayOrder = useMemo(() => {
    if (formulas.length === 0) return 0;
    return Math.max(...formulas.map((f) => f.display_order ?? 0)) + 1;
  }, [formulas]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      setName(editing.name);
      setPriceStr(String(editing.price ?? 0));
      setDescription(editing.description ?? "");
      setDisplayOrder(String(editing.display_order ?? 0));
      setIsActive(editing.is_active ?? true);
      return;
    }
    setName("");
    setPriceStr("0");
    setDescription("");
    setDisplayOrder(String(nextDisplayOrder));
    setIsActive(true);
  }, [dialogOpen, editing, nextDisplayOrder]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["menu-formulas", menuId, establishmentId, organizationId],
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error(t("formulas_error_name"));
      const price = parsePrice(priceStr);
      if (Number.isNaN(price) || price < 0) throw new Error(t("formulas_error_price"));
      const orderRaw = parseInt(displayOrder, 10);
      const display_order = Number.isFinite(orderRaw) ? orderRaw : 0;
      const supabase = createClient();
      const desc = description.trim() ? description.trim() : null;

      if (editing) {
        const { error } = await supabase
          .from("formulas")
          .update({
            name: trimmed,
            price,
            description: desc,
            display_order,
            is_active: isActive,
            establishment_id: establishmentId,
          })
          .eq("id", editing.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("formulas").insert({
        menu_id: menuId,
        organization_id: organizationId,
        establishment_id: establishmentId,
        name: trimmed,
        price,
        description: desc,
        display_order,
        is_active: isActive,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? t("formulas_saved") : t("formulas_created"));
      invalidate();
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("formulas_error_save"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("formulas").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("formulas_deleted"));
      invalidate();
      setDeleteTarget(null);
    },
    onError: () => toast.error(t("formulas_error_delete")),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (f: Tables<"formulas">) => {
    setEditing(f);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("formulas_loading")}</p>;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("formulas_error_load")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-muted-foreground max-w-2xl text-sm">{t("formulas_intro")}</p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("formulas_add")}
        </Button>
      </div>

      {formulas.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("formulas_empty")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("formulas_col_name")}</TableHead>
                <TableHead className="w-[120px]">{t("formulas_col_price")}</TableHead>
                <TableHead className="w-[100px]">{t("formulas_col_active")}</TableHead>
                <TableHead className="w-[160px] text-right">{t("formulas_col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formulas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="font-medium">{f.name}</div>
                    {f.description ? (
                      <div className="text-muted-foreground line-clamp-2 text-xs">{f.description}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{eur.format(f.price)}</TableCell>
                  <TableCell>
                    <Badge variant={f.is_active ? "default" : "secondary"}>
                      {f.is_active ? t("formulas_active_yes") : t("formulas_active_no")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={t("formulas_composition_open")}
                      onClick={() => setCompositionFormula(f)}
                      aria-label={t("formulas_composition_open")}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(f)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("formulas_dialog_edit") : t("formulas_dialog_create")}</DialogTitle>
            <DialogDescription>{t("formulas_dialog_hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="formula-name">{t("formulas_field_name")}</Label>
              <Input id="formula-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula-price">{t("formulas_field_price")}</Label>
              <Input
                id="formula-price"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                inputMode="decimal"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula-desc">{t("formulas_field_description")}</Label>
              <Textarea
                id="formula-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula-order">{t("formulas_field_order")}</Label>
              <Input
                id="formula-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="formula-active">{t("formulas_field_active")}</Label>
              <Switch id="formula-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t("formulas_cancel")}
            </Button>
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? t("formulas_saving") : t("formulas_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MenuFormulaCompositionSheet
        open={compositionFormula !== null}
        onOpenChange={(o) => !o && setCompositionFormula(null)}
        formula={compositionFormula}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("formulas_delete_title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground text-sm">{t("formulas_delete_confirm")}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("formulas_cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? t("formulas_saving") : t("formulas_delete_action")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
