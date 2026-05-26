"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type AffectedRecipe,
  type BlockingSlot,
  type FormulaReplacement,
  useArchivePrecheck,
  useArchiveProduct,
  useReplacementProducts,
} from "@/lib/queries/product-archive";

// ─── Types locaux ─────────────────────────────────────────────────────────────

type Props = {
  productId: string;
  productName: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
};

// ─── Hook état dialog ─────────────────────────────────────────────────────────

function useDialogState(
  open: boolean,
  blockingSlots: BlockingSlot[],
  affectedRecipes: AffectedRecipe[],
  precheckLoading: boolean,
) {
  const [replacements, setReplacements] = useState<Map<string, string | null>>(new Map());
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setReplacements(new Map());
      setAcknowledged(new Set());
    }
  }, [open]);

  const allSlotsResolved = blockingSlots.every((s) => replacements.has(s.slotId));
  const allRecipesAcknowledged = affectedRecipes.every((r) => acknowledged.has(r.compositionId));
  const canArchive = !precheckLoading && allSlotsResolved && allRecipesAcknowledged;

  const handleReplace = (slotId: string, value: string | null) => {
    setReplacements((prev) => new Map(prev).set(slotId, value));
  };

  const handleAcknowledge = (id: string, checked: boolean) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return { replacements, acknowledged, canArchive, handleReplace, handleAcknowledge };
}

// ─── Section formules bloquées ────────────────────────────────────────────────

function FormulaSlotsSection({
  blockingSlots,
  replacements,
  replacementOptions,
  onReplace,
}: {
  blockingSlots: BlockingSlot[];
  replacements: Map<string, string | null>;
  replacementOptions: { id: string; name: string }[];
  onReplace: (slotId: string, value: string | null) => void;
}) {
  if (!blockingSlots.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 font-medium">
        <XCircle className="text-destructive h-4 w-4 shrink-0" />
        <span className="text-sm">Formules affectées — action requise</span>
      </div>
      <p className="text-muted-foreground text-xs">
        Ce produit est le seul dans ces slots. La formule ne pourra plus être commandée si le slot reste vide.
      </p>
      <div className="space-y-2">
        {blockingSlots.map((slot) => (
          <div key={slot.slotId} className="rounded-md border p-3 text-sm">
            <p className="font-medium">
              {slot.formulaName} › {slot.slotName}
            </p>
            <p className="text-muted-foreground text-xs">{slot.establishmentName}</p>
            <Select
              value={replacements.has(slot.slotId) ? (replacements.get(slot.slotId) ?? "__empty__") : ""}
              onValueChange={(v) => onReplace(slot.slotId, v === "__empty__" ? null : v)}
            >
              <SelectTrigger className="mt-2 h-8 text-sm">
                <SelectValue placeholder="Choisir un remplacement…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">
                  <span className="text-destructive text-sm">Laisser le slot vide</span>
                </SelectItem>
                {replacementOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section recettes impactées ────────────────────────────────────────────────

function AffectedRecipesSection({
  affectedRecipes,
  acknowledged,
  onAcknowledge,
}: {
  affectedRecipes: AffectedRecipe[];
  acknowledged: Set<string>;
  onAcknowledge: (id: string, checked: boolean) => void;
}) {
  if (!affectedRecipes.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-sm">Recettes impactées — confirmation requise</span>
      </div>
      <p className="text-muted-foreground text-xs">
        Cet ingrédient sera retiré de ces recettes actives. Leur food cost sera affecté.
      </p>
      <div className="space-y-2">
        {affectedRecipes.map((recipe) => (
          <label
            key={recipe.compositionId}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
          >
            <Checkbox
              checked={acknowledged.has(recipe.compositionId)}
              onCheckedChange={(v) => onAcknowledge(recipe.compositionId, !!v)}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-medium">{recipe.recipeName}</p>
              <p className="text-muted-foreground text-xs">{recipe.establishmentName}</p>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

export function ArchiveProductDialog({
  productId,
  productName,
  organizationId,
  open,
  onOpenChange,
  onArchived,
}: Props) {
  const precheck = useArchivePrecheck(productId, organizationId, open);
  const blockingSlots = precheck.data?.blockingSlots ?? [];
  const affectedRecipes = precheck.data?.affectedRecipes ?? [];
  const hasBlockingSlots = blockingSlots.length > 0;
  const hasAffectedRecipes = affectedRecipes.length > 0;

  const { replacements, acknowledged, canArchive, handleReplace, handleAcknowledge } = useDialogState(
    open,
    blockingSlots,
    affectedRecipes,
    precheck.isLoading,
  );

  const replacementProducts = useReplacementProducts(organizationId, productId, open && hasBlockingSlots);

  const archive = useArchiveProduct(organizationId, () => {
    onOpenChange(false);
    onArchived?.();
  });

  const handleArchive = () => {
    const formulaReplacements: FormulaReplacement[] = blockingSlots.map((s) => ({
      slotId: s.slotId,
      formulaId: s.formulaId,
      establishmentId: s.establishmentId,
      replacementProductId: replacements.get(s.slotId) ?? null,
    }));
    archive.mutate({ productId, formulaReplacements });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Archiver « {productName} »</DialogTitle>
        </DialogHeader>

        {precheck.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground text-sm">Vérification des impacts…</span>
          </div>
        ) : (
          <div className="space-y-5">
            {!hasBlockingSlots && !hasAffectedRecipes && (
              <p className="text-muted-foreground text-sm">
                Le produit sera retiré de la carte publique, des menus et des grilles. Les données historiques
                (commandes, stocks, historique de prix) restent intactes.
              </p>
            )}

            <FormulaSlotsSection
              blockingSlots={blockingSlots}
              replacements={replacements}
              replacementOptions={replacementProducts.data ?? []}
              onReplace={handleReplace}
            />

            <AffectedRecipesSection
              affectedRecipes={affectedRecipes}
              acknowledged={acknowledged}
              onAcknowledge={handleAcknowledge}
            />

            {(hasBlockingSlots || hasAffectedRecipes) && (
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Cet archivage affecte tous les établissements de l&apos;organisation simultanément. Les données
                historiques restent intactes.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={archive.isPending || precheck.isLoading || !canArchive}
            onClick={handleArchive}
          >
            {archive.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Archivage…
              </>
            ) : (
              "Archiver"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
