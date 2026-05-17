"use client";

import { useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useFormulaProductsByFormula,
  useFormulaSlots,
  useOrganizationProducts,
  type FormulaProductWithProduct,
} from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

import { AddFormulaProductCard } from "./add-formula-product-card";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function parseMoney(raw: string): number | null {
  const t = raw.replace(",", ".").trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function MenuFormulaCompositionSheet({
  open,
  onOpenChange,
  formula,
  establishmentId,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formula: Tables<"formulas"> | null;
  establishmentId: string;
  organizationId: string;
}) {
  const t = useTranslations("establishments.menus_page");
  const queryClient = useQueryClient();
  const formulaId = formula?.id;

  const { data: slots = [], isLoading: slotsLoading } = useFormulaSlots(formulaId, establishmentId, organizationId);
  const { data: formulaProducts = [], isLoading: fpLoading } = useFormulaProductsByFormula(
    formulaId,
    establishmentId,
    organizationId,
  );
  const { data: orgProductsRaw = [], isLoading: orgProductsLoading } = useOrganizationProducts(
    open ? organizationId : undefined,
  );

  const catalogProducts = useMemo(() => {
    const byId = new Map<string, Tables<"products">>();
    for (const p of orgProductsRaw as Tables<"products">[]) {
      if (p?.id && !byId.has(p.id)) byId.set(p.id, p);
    }
    return Array.from(byId.values());
  }, [orgProductsRaw]);

  const productsBySlot = useMemo(() => {
    const m = new Map<string, FormulaProductWithProduct[]>();
    for (const fp of formulaProducts) {
      if (!fp?.id || !fp.slot_id) continue;
      const list = m.get(fp.slot_id) ?? [];
      if (list.some((x) => x.id === fp.id)) continue;
      list.push(fp);
      m.set(fp.slot_id, list);
    }
    return m;
  }, [formulaProducts]);

  const invalidate = () => {
    if (!formulaId) return;
    void queryClient.invalidateQueries({
      queryKey: ["formula-slots", formulaId, establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["formula-products", formulaId, establishmentId, organizationId],
    });
  };

  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Tables<"formula_slots"> | null>(null);
  const [slotName, setSlotName] = useState("");
  const [slotOrderStr, setSlotOrderStr] = useState("0");

  const [deleteSlotTarget, setDeleteSlotTarget] = useState<Tables<"formula_slots"> | null>(null);

  const [addTargetSlotId, setAddTargetSlotId] = useState<string>("");
  const [addProductId, setAddProductId] = useState<string>("");
  const [addSupplementStr, setAddSupplementStr] = useState("");

  const openNewSlot = () => {
    setEditingSlot(null);
    const next = slots.length === 0 ? 0 : Math.max(...slots.map((s) => s.slot_order ?? 0)) + 1;
    setSlotName("");
    setSlotOrderStr(String(next));
    setSlotDialogOpen(true);
  };

  const openEditSlot = (s: Tables<"formula_slots">) => {
    setEditingSlot(s);
    setSlotName(s.name);
    setSlotOrderStr(String(s.slot_order ?? 0));
    setSlotDialogOpen(true);
  };

  const saveSlotMutation = useMutation({
    mutationFn: async () => {
      if (!formulaId) return;
      const name = slotName.trim();
      if (!name) throw new Error(t("formula_slot_error_name"));
      const order = parseInt(slotOrderStr, 10);
      const slot_order = Number.isFinite(order) ? order : 0;
      const supabase = createClient();
      if (editingSlot) {
        const { error } = await supabase.from("formula_slots").update({ name, slot_order }).eq("id", editingSlot.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("formula_slots").insert({
        formula_id: formulaId,
        establishment_id: establishmentId,
        organization_id: organizationId,
        name,
        slot_order,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingSlot ? t("formula_slot_saved") : t("formula_slot_created"));
      invalidate();
      setSlotDialogOpen(false);
      setEditingSlot(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("formula_slot_error_save")),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const supabase = createClient();
      const { error: e1 } = await supabase.from("formula_products").update({ deleted: true }).eq("slot_id", slotId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("formula_slots").update({ deleted: true }).eq("id", slotId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(t("formula_slot_deleted"));
      invalidate();
      setDeleteSlotTarget(null);
    },
    onError: () => toast.error(t("formula_slot_error_delete")),
  });

  const addProductMutation = useMutation({
    mutationFn: async ({
      slotId,
      productId,
      supplement,
    }: {
      slotId: string;
      productId: string;
      supplement: number | null;
    }) => {
      if (!formulaId) return;
      const inSlot = productsBySlot.get(slotId) ?? [];
      if (inSlot.some((p) => p.product_id === productId)) {
        throw new Error(t("formula_product_duplicate"));
      }
      const nextOrder = inSlot.length === 0 ? 0 : Math.max(...inSlot.map((p) => p.display_order ?? 0)) + 1;
      const supabase = createClient();
      const { error } = await supabase.from("formula_products").insert({
        formula_id: formulaId,
        slot_id: slotId,
        product_id: productId,
        establishment_id: establishmentId,
        organization_id: organizationId,
        supplement_price: supplement,
        display_order: nextOrder,
        is_active: true,
        is_default: false,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("formula_product_added"));
      invalidate();
      setAddProductId("");
      setAddSupplementStr("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("formula_product_error_add")),
  });

  const updateSupplementMutation = useMutation({
    mutationFn: async ({ id, supplement }: { id: string; supplement: number | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from("formula_products").update({ supplement_price: supplement }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => toast.error(t("formula_product_error_supplement")),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("formula_products").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("formula_product_removed"));
      invalidate();
    },
    onError: () => toast.error(t("formula_product_error_remove")),
  });

  const loading = slotsLoading || fpLoading || (open && orgProductsLoading);

  const handleBlurSupplement = (fp: FormulaProductWithProduct, raw: string) => {
    const v = parseMoney(raw);
    if (Number.isNaN(v as number)) {
      toast.error(t("formula_product_error_supplement"));
      return;
    }
    const current = fp.supplement_price;
    const same =
      (v === null && (current === null || current === undefined)) ||
      (v !== null && current !== null && Math.abs(v - current) < 1e-6);
    if (same) return;
    updateSupplementMutation.mutate({ id: fp.id, supplement: v });
  };

  const submitAddProduct = () => {
    if (!addTargetSlotId) {
      toast.error(t("formula_product_pick_slot"));
      return;
    }
    if (!addProductId) {
      toast.error(t("formula_product_pick"));
      return;
    }
    const sup = parseMoney(addSupplementStr);
    if (Number.isNaN(sup as number)) {
      toast.error(t("formula_product_error_supplement"));
      return;
    }
    addProductMutation.mutate({ slotId: addTargetSlotId, productId: addProductId, supplement: sup });
  };

  const pickableForTargetSlot = useMemo(() => {
    if (!addTargetSlotId) return catalogProducts;
    const rows = productsBySlot.get(addTargetSlotId) ?? [];
    const used = new Set(rows.map((r) => r.product_id));
    return catalogProducts.filter((p) => !used.has(p.id));
  }, [addTargetSlotId, catalogProducts, productsBySlot]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full max-h-[100dvh] min-h-0 w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 border-b px-4 pt-4 pb-4 text-left">
            <SheetTitle>{t("formula_composition_title")}</SheetTitle>
            <SheetDescription>
              {formula ? (
                <>
                  <span className="text-foreground font-medium">{formula.name}</span>
                  {" — "}
                  {t("formula_composition_base_price", { price: eur.format(formula.price) })}
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pt-2 pb-4">
            <p className="text-muted-foreground shrink-0 text-xs">{t("formula_composition_hint")}</p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" size="sm" className="w-fit" onClick={openNewSlot} disabled={!formulaId}>
                <Plus className="mr-2 h-4 w-4" />
                {t("formula_slot_add")}
              </Button>
            </div>

            {slots.length > 0 && catalogProducts.length > 0 ? (
              <AddFormulaProductCard
                slots={slots}
                pickableForTargetSlot={pickableForTargetSlot}
                addTargetSlotId={addTargetSlotId}
                setAddTargetSlotId={setAddTargetSlotId}
                addProductId={addProductId}
                setAddProductId={setAddProductId}
                addSupplementStr={addSupplementStr}
                setAddSupplementStr={setAddSupplementStr}
                isPending={addProductMutation.isPending}
                onSubmit={submitAddProduct}
                t={t}
              />
            ) : null}

            {loading ? (
              <p className="text-muted-foreground shrink-0 text-sm">{t("formula_composition_loading")}</p>
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground shrink-0 text-sm">{t("formula_composition_empty_slots")}</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                <div className="space-y-6 pb-8">
                  {slots.map((slot) => {
                    const rows = productsBySlot.get(slot.id) ?? [];

                    return (
                      <Card key={slot.id}>
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 py-3">
                          <div>
                            <div className="font-semibold">{slot.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {t("formula_slot_order_label")} {slot.slot_order}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditSlot(slot)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              {t("formula_slot_edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteSlotTarget(slot)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          {rows.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{t("formula_slot_no_products")}</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("formula_product_col_name")}</TableHead>
                                  <TableHead className="w-[130px]">{t("formula_product_col_supplement")}</TableHead>
                                  <TableHead className="w-[56px]" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((fp) => (
                                  <TableRow key={fp.id}>
                                    <TableCell className="font-medium">
                                      {fp.product?.name ?? fp.product_id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 tabular-nums"
                                        defaultValue={fp.supplement_price != null ? String(fp.supplement_price) : ""}
                                        placeholder="0"
                                        inputMode="decimal"
                                        onBlur={(e) => handleBlurSupplement(fp, e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive h-8 w-8"
                                        onClick={() => deleteProductMutation.mutate(fp.id)}
                                        aria-label="remove"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSlot ? t("formula_slot_dialog_edit") : t("formula_slot_dialog_create")}</DialogTitle>
            <DialogDescription>{t("formula_slot_dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="slot-name">{t("formula_slot_name")}</Label>
              <Input id="slot-name" value={slotName} onChange={(e) => setSlotName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-order">{t("formula_slot_order_field")}</Label>
              <Input
                id="slot-order"
                type="number"
                min={0}
                value={slotOrderStr}
                onChange={(e) => setSlotOrderStr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSlotDialogOpen(false)}>
              {t("formulas_cancel")}
            </Button>
            <Button type="button" disabled={saveSlotMutation.isPending} onClick={() => saveSlotMutation.mutate()}>
              {saveSlotMutation.isPending ? t("formulas_saving") : t("formulas_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteSlotTarget !== null} onOpenChange={(o) => !o && setDeleteSlotTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("formula_slot_delete_title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground text-sm">{t("formula_slot_delete_confirm")}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("formulas_cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSlotMutation.isPending}
              onClick={() => deleteSlotTarget && deleteSlotMutation.mutate(deleteSlotTarget.id)}
            >
              {t("formula_slot_delete_action")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
