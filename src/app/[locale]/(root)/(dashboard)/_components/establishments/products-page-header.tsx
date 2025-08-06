"use client";

import { Plus, Package } from "lucide-react";

import { Button } from "@/components/ui/button";

// Composant pour l'en-tête de la page
export function PageHeader({
  setShowAddForm,
  setShowAddProductsModal,
}: {
  setShowAddForm: (show: boolean) => void;
  setShowAddProductsModal: (show: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Produits</h1>
        <p className="text-muted-foreground">Gérez les produits de l&apos;établissement</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un produit
        </Button>
        <Button onClick={() => setShowAddProductsModal(true)} variant="outline">
          <Package className="mr-2 h-4 w-4" />
          Ajouter plusieurs produits
        </Button>
      </div>
    </div>
  );
}
