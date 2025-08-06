"use client";

import { Edit, Trash2, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductWithStock } from "@/lib/types/database-extensions";

import type { Product } from "./_components";

// Composant pour le tableau des produits
export function ProductsTable({
  products,
  searchTerm,
  setSearchTerm,
  startEditProduct,
  startEditStock,
  deleteProduct,
}: {
  products: ProductWithStock[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  startEditProduct: (product: Product) => void;
  startEditStock: (product: ProductWithStock) => void;
  deleteProduct: (id: string) => void;
}) {
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-muted-foreground text-sm">{product.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{product.price.toFixed(2)} €</div>
                  <div className="text-muted-foreground text-sm">TVA {product.vat_rate}%</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {product.stock?.current_stock ?? 0} / {product.stock?.max_stock ?? "∞"}
                  </div>
                  <div className="text-muted-foreground text-sm">Min: {product.stock?.min_stock ?? 0}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{product.stock ? "Avec stock" : "Sans stock"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => startEditProduct(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEditStock(product)}>
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
