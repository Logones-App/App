"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMenuProducts } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";

interface MenuProductsTableProps {
  menuId: string;
  onAddProduct: () => void;
}

export function MenuProductsTable({ menuId, onAddProduct }: MenuProductsTableProps) {
  const { data: products, isLoading, isError } = useMenuProducts(menuId);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async ({ menus_products_id, price }: { menus_products_id: string; price: number }) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").update({ price }).eq("id", menus_products_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditingId(null);
      setEditPrice("");
    },
  });

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const deleteProductMutation = useMutation({
    mutationFn: async (menus_products_id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").delete().eq("id", menus_products_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteProductId(null);
    },
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Produits du menu</h3>
        <Button size="sm" onClick={onAddProduct}>
          + Associer un produit
        </Button>
      </div>
      {isLoading && <Skeleton className="h-8 w-full" />}
      {isError && <p className="text-destructive text-xs">Erreur lors du chargement des produits du menu.</p>}
      {(!products || products.length === 0) && !isLoading && (
        <p className="text-muted-foreground text-xs">Aucun produit dans ce menu.</p>
      )}
      {products && products.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>
                  {editingId === product.menus_products_id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate({ menus_products_id: product.menus_products_id, price: parseFloat(editPrice) });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 rounded border p-1 text-right"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={mutation.isPending}>
                        OK
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </form>
                  ) : (
                    <span
                      onClick={() => {
                        setEditingId(product.menus_products_id);
                        setEditPrice(product.price?.toString() ?? "");
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      {product.price ? `${product.price} €` : "Non défini"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteProductId(product.menus_products_id)}
                    disabled={deleteProductMutation.isPending}
                  >
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
