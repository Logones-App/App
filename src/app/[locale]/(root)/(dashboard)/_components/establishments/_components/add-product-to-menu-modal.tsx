"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstablishmentProductsNotInMenus } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";

interface AddProductToMenuModalProps {
  menuId: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductToMenuModal({ menuId, organizationId, open, onOpenChange }: AddProductToMenuModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: availableProducts, isLoading } = useEstablishmentProductsNotInMenus(organizationId, menuId);

  const mutation = useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").insert({
        menus_id: menuId,
        products_id: productId,
        organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setSelectedProductId("");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId) {
      mutation.mutate(selectedProductId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Associer un produit de l&apos;organisation à ce menu</DialogTitle>
          <DialogDescription>Sélectionnez un produit à associer à ce menu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Produit</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="" disabled>
                    Chargement...
                  </SelectItem>
                ) : availableProducts && availableProducts.length > 0 ? (
                  availableProducts.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    Aucun produit disponible
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!selectedProductId || mutation.isPending}>
              {mutation.isPending ? "Association..." : "Associer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
