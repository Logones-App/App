"use client";

import { useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";

type SourceProduct = {
  id: string;
  name: string;
  category_id: string | null;
  vat_rate_id: string | null;
};

/**
 * Crée un ingrédient (matière) pré-rempli à partir d'un produit. NE RELIE PAS : le rattachement
 * se fait ensuite explicitement en ajoutant l'ingrédient à la recette du produit.
 */
export function CreateIngredientFromProductCard({
  product,
  establishmentId,
  organizationId,
}: {
  product: SourceProduct;
  establishmentId: string;
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Créer un ingrédient à partir de ce produit</CardTitle>
        <CardDescription>
          Crée une matière (achat/stock) pré-remplie depuis ce produit. Elle n&apos;est pas reliée automatiquement :
          ajoutez-la ensuite à la recette du produit pour décrémenter son stock.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Créer un ingrédient
        </Button>
      </CardContent>
      {open && (
        <CreateIngredientFromProductModal
          product={product}
          establishmentId={establishmentId}
          organizationId={organizationId}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

function CreateIngredientFromProductModal({
  product,
  establishmentId,
  organizationId,
  onClose,
}: {
  product: SourceProduct;
  establishmentId: string;
  organizationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [name, setName] = useState(`${product.name} (matière)`);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Le nom est requis.");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: trimmed,
          category_id: product.category_id,
          vat_rate_id: product.vat_rate_id,
          product_type: ["ingredient"],
          is_available: true,
          deleted: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (ingredientId) => {
      toast.success("Ingrédient créé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      onClose();
      // Redirige vers la fiche de l'ingrédient (remplace le dernier segment = produit source).
      router.push(pathname.replace(/\/[^/]+\/?$/, `/${ingredientId}`));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la création."),
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un ingrédient</DialogTitle>
          <DialogDescription>
            Cette matière servira à gérer l&apos;achat et le stock. Elle n&apos;est pas reliée au produit tant que vous
            ne l&apos;ajoutez pas à sa recette.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="ing-name">Nom de l&apos;ingrédient</Label>
          <Input id="ing-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={name.trim() === "" || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Création…" : "Créer l'ingrédient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
