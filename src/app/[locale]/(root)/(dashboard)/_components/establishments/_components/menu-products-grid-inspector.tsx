"use client";

import { useState } from "react";

import { ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseCategoryGridAction, resolveGridTapIntent } from "@/lib/menu-grid/category-grid-action";
import { cn } from "@/lib/utils";

import { isCategoryNavigable, tapIntentTranslationKey, type GridItem } from "./menu-products-grid-model";
import { usePatchMenuGridItemColorsMutation } from "./use-insert-menu-grid-item";

const COLOR_PRESETS: { bg: string; text: string }[] = [
  // Pastels clairs — texte foncé
  { bg: "#fbf8cc", text: "#1c1917" },
  { bg: "#fde4cf", text: "#1c1917" },
  { bg: "#ffcfd2", text: "#1c1917" },
  { bg: "#f1c0e8", text: "#1c1917" },
  { bg: "#cfbaf0", text: "#1c1917" },
  { bg: "#a3c4f3", text: "#1c1917" },
  { bg: "#90dbf4", text: "#1c1917" },
  { bg: "#8eecf5", text: "#1c1917" },
  { bg: "#98f5e1", text: "#1c1917" },
  { bg: "#b9fbc0", text: "#1c1917" },
  // Vives — texte adapté
  { bg: "#669900", text: "#ffffff" },
  { bg: "#99cc33", text: "#1c1917" },
  { bg: "#ccee66", text: "#1c1917" },
  { bg: "#006699", text: "#ffffff" },
  { bg: "#3399cc", text: "#ffffff" },
  { bg: "#990066", text: "#ffffff" },
  { bg: "#cc3399", text: "#ffffff" },
  { bg: "#ff6600", text: "#ffffff" },
  { bg: "#ff9900", text: "#1c1917" },
  { bg: "#ffcc00", text: "#1c1917" },
  // Rainbow ton #df5e3a (min=0x3a, max=0xdf, milieu variable)
  { bg: "#df3a3a", text: "#ffffff" },
  { bg: "#df5e3a", text: "#ffffff" },
  { bg: "#df8c3a", text: "#1c1917" },
  { bg: "#dfbe3a", text: "#1c1917" },
  { bg: "#a8df3a", text: "#1c1917" },
  { bg: "#3adf7a", text: "#1c1917" },
  { bg: "#3adfcf", text: "#1c1917" },
  { bg: "#3a8adf", text: "#ffffff" },
  { bg: "#7a3adf", text: "#ffffff" },
  { bg: "#df3ab0", text: "#ffffff" },
];

export function MenuProductsGridInspector({
  selectedItem,
  open,
  onOpenChange,
  menuId,
  establishmentId,
  organizationId,
  gridBusy,
  onEnterCategory,
  onRemoveTile,
}: {
  selectedItem: GridItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  menuId: string;
  establishmentId: string;
  organizationId: string;
  gridBusy: boolean;
  onEnterCategory: (item: GridItem) => void;
  onRemoveTile: (item: GridItem) => void;
}) {
  const t = useTranslations("establishments.menus_page");
  const patchColors = usePatchMenuGridItemColorsMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleOpenChange = (o: boolean) => {
    if (!o) setConfirmDelete(false);
    onOpenChange(o);
  };

  if (!selectedItem) return null;

  const currentBg = selectedItem.background_color ?? null;

  const handleColorSelect = (bg: string | null, text: string | null) => {
    patchColors.mutate({
      gridItemId: selectedItem.id,
      menuId,
      establishmentId,
      organizationId,
      background_color: bg,
      text_color: text,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{selectedItem.label ?? "—"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Aperçu */}
          <div
            className="flex h-14 items-center justify-center rounded-lg border text-sm font-medium"
            style={{
              backgroundColor: currentBg ?? undefined,
              color: selectedItem.text_color ?? undefined,
            }}
          >
            {selectedItem.label ?? "—"}
          </div>

          {/* Couleurs */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Couleur de la tuile</p>
            <div className="grid grid-cols-10 gap-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.bg}
                  type="button"
                  title={c.bg}
                  disabled={patchColors.isPending}
                  onClick={() => handleColorSelect(c.bg, c.text)}
                  className={cn(
                    "h-7 w-7 rounded border-2 shadow-sm transition-transform hover:scale-110 active:scale-95",
                    currentBg === c.bg ? "border-primary ring-primary ring-1 ring-offset-1" : "border-transparent",
                  )}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {isCategoryNavigable(selectedItem) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                disabled={gridBusy}
                onClick={() => {
                  onEnterCategory(selectedItem);
                  handleOpenChange(false);
                }}
              >
                {t("products_grid_open_subcategory")}
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Button>
            )}

            {confirmDelete ? (
              <div className="border-destructive/50 bg-destructive/5 space-y-2 rounded-lg border p-3">
                <p className="text-destructive text-sm font-medium">Retirer cette tuile ?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={gridBusy}
                    onClick={() => {
                      onRemoveTile(selectedItem);
                      handleOpenChange(false);
                    }}
                  >
                    Retirer
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive w-full justify-start"
                disabled={gridBusy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                {t("products_grid_remove_button")}
              </Button>
            )}
          </div>

          {/* Info tap */}
          <p className="text-muted-foreground border-t pt-3 text-xs">
            {t(tapIntentTranslationKey(resolveGridTapIntent(selectedItem)))}
            {" · "}
            {parseCategoryGridAction(selectedItem.action).type}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
