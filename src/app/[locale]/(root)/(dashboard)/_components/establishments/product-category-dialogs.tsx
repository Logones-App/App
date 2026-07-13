"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationVatRates } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type CategoryRow = Tables<"categories">;

const NONE = "__none__";

function toSelectValue(id: string | null | undefined): string {
  return id ?? NONE;
}

function toNullableId(v: string): string | null {
  return v === NONE ? null : v;
}

function invalidateCategoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  establishmentId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["organization-categories", organizationId] });
  void queryClient.invalidateQueries({ queryKey: ["establishment-categories", establishmentId, organizationId] });
  void queryClient.invalidateQueries({ queryKey: ["menu-palette-catalog", establishmentId, organizationId] });
}

export function CategoryUpsertDialog({
  open,
  onOpenChange,
  category,
  establishmentId,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  establishmentId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const { data: vatRates = [], isLoading: vatLoading } = useOrganizationVatRates(organizationId);

  const [name, setName] = useState("");
  const [vatRateId, setVatRateId] = useState<string>(NONE);

  const defaultVat = useMemo(() => vatRates[0]?.id ?? NONE, [vatRates]);

  useEffect(() => {
    if (!open) return;
    if (category) {
      setName(category.name);
      setVatRateId(toSelectValue(category.vat_rate_id));
      return;
    }
    setName("");
    setVatRateId(defaultVat);
  }, [open, category, defaultVat]);

  const orphanVatId =
    category?.vat_rate_id && !vatRates.some((v) => v.id === category.vat_rate_id) ? category.vat_rate_id : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Le nom est obligatoire.");
      const vat = toNullableId(vatRateId);
      const supabase = createClient();
      if (category) {
        const { error } = await supabase
          .from("categories")
          .update({ name: trimmed, vat_rate_id: vat })
          .eq("id", category.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("categories").insert({
        name: trimmed,
        establishment_id: establishmentId,
        organization_id: organizationId,
        deleted: false,
        vat_rate_id: vat,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(category ? "Catégorie mise à jour." : "Catégorie créée.");
      invalidateCategoryQueries(queryClient, organizationId, establishmentId);
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>
            Dossier de navigation dans la grille POS. Le taux de TVA s&apos;applique aux produits sans TVA propre.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nom</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Entrées"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  mutation.mutate();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-vat">TVA par défaut</Label>
            <Select value={vatRateId} onValueChange={setVatRateId} disabled={vatLoading}>
              <SelectTrigger id="category-vat" className="w-full">
                <SelectValue placeholder={vatLoading ? "Chargement…" : "Choisir…"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun</SelectItem>
                {orphanVatId ? <SelectItem value={orphanVatId}>Référence actuelle (hors liste)</SelectItem> : null}
                {vatRates.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name ?? `${v.value ?? 0} %`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || !name.trim() || vatLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Enregistrement…" : category ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryDeleteBlockedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suppression impossible</AlertDialogTitle>
          <AlertDialogDescription>
            Veuillez d&apos;abord déplacer les produits de la catégorie avant de la supprimer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CategoryDeleteConfirmDialog({
  open,
  onOpenChange,
  categoryName,
  categoryId,
  organizationId,
  establishmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  categoryId: string;
  organizationId: string;
  establishmentId: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("categories").update({ deleted: true }).eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catégorie supprimée.");
      invalidateCategoryQueries(queryClient, organizationId, establishmentId);
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer la catégorie « {categoryName} » ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
