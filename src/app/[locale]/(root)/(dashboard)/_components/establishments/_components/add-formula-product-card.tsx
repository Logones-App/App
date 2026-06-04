"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/lib/supabase/database.types";

export function AddFormulaProductCard({
  slots,
  pickableForTargetSlot,
  addTargetSlotId,
  setAddTargetSlotId,
  addProductId,
  setAddProductId,
  addSupplementStr,
  setAddSupplementStr,
  isPending,
  onSubmit,
  t,
}: {
  slots: Tables<"formula_slots">[];
  pickableForTargetSlot: Tables<"products">[];
  addTargetSlotId: string;
  setAddTargetSlotId: (v: string) => void;
  addProductId: string;
  setAddProductId: (v: string) => void;
  addSupplementStr: string;
  setAddSupplementStr: (v: string) => void;
  isPending: boolean;
  onSubmit: () => void;
  t: ReturnType<typeof useTranslations<"establishments.menus_page">>;
}) {
  return (
    <Card className="shrink-0 border-dashed">
      <CardHeader className="py-3">
        <div className="text-sm font-medium">{t("formula_product_add_block_title")}</div>
        <p className="text-muted-foreground text-xs font-normal">{t("formula_product_add_block_hint")}</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">{t("formula_product_slot_select")}</Label>
            <Select
              value={addTargetSlotId || undefined}
              onValueChange={(v) => {
                setAddTargetSlotId(v);
                setAddProductId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("formula_product_slot_ph")} />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">{t("formula_product_select")}</Label>
            <Select value={addProductId || undefined} onValueChange={setAddProductId} disabled={!addTargetSlotId}>
              <SelectTrigger>
                <SelectValue placeholder={t("formula_product_select_ph")} />
              </SelectTrigger>
              <SelectContent>
                {pickableForTargetSlot.length === 0 ? (
                  <div className="text-muted-foreground p-2 text-sm">{t("formula_product_none_left")}</div>
                ) : (
                  pickableForTargetSlot.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t("formula_product_col_supplement")}</Label>
            <Input
              placeholder={t("formula_product_supplement_ph")}
              inputMode="decimal"
              className="tabular-nums"
              value={addSupplementStr}
              onChange={(e) => setAddSupplementStr(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isPending || !addTargetSlotId || !addProductId}
              onClick={onSubmit}
            >
              {t("formula_product_add_btn")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
