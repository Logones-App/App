"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductCompositionRow, ProductWithCategoryName } from "@/lib/queries/product-establishment-dashboard";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function kindLabel(kind: string) {
  if (kind === "recipe") return "Recette (BOM / quantités)";
  if (kind === "modifier") return "Modificateur (supplément)";
  return kind;
}

export function ProductFicheTechniquePanel({
  product,
  compositions,
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
}) {
  const technicalLines = compositions.filter((c) => c.main_product_id !== c.component_product_id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fiche technique — recette</CardTitle>
          <CardDescription>
            Ingrédients et quantités pour documenter la recette (poids, portions, coûts). Les lignes en{" "}
            <span className="font-medium">recipe</span> participent au BOM caisse ; en{" "}
            <span className="font-medium">modifier</span>, ce sont des suppléments client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Pour des ingrédients <span className="font-medium">uniquement informatifs</span> (pas à la carte, pas en
            modale), vous pouvez aujourd&apos;hui utiliser une ligne <span className="font-medium">recipe</span> avec{" "}
            <span className="font-medium">show_in_customization = false</span> : elles restent dans la recette pour les
            quantités, sans proposition en perso. Une valeur dédiée du type{" "}
            <span className="font-medium">technical</span> pourra être ajoutée en base si vous voulez les exclure
            explicitement du BOM tout en gardant les quantités.
          </p>
          {technicalLines.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun ingrédient (hors ligne self) sur ce produit.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrédient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qté défaut</TableHead>
                    <TableHead className="text-right">Qté max</TableHead>
                    <TableHead>Modale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicalLines.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.component?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{kindLabel(c.composition_kind)}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.default_quantity ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.max_quantity ?? "—"}</TableCell>
                      <TableCell>{c.show_in_customization ? "Visible" : "Masquée"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coûts et marge (cible)</CardTitle>
          <CardDescription>
            Prix de vente catalogue vs coût de revient des composants — calcul automatique à brancher lorsque les prix
            d&apos;achat seront stockés (ex. sur <span className="font-medium">products</span> ou table fournisseurs).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Prix de vente (catalogue)</p>
              <p className="text-2xl font-semibold tabular-nums">{eur.format(product.price)}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-sm">Coût matière estimé</p>
              <p className="text-muted-foreground text-lg">—</p>
              <p className="text-muted-foreground text-xs">
                Sera la somme Σ (quantité recette × prix d&apos;achat unitaire du composant), hors options.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-muted-foreground text-sm">Marge brute</p>
            <p className="text-muted-foreground">—</p>
            <p className="text-muted-foreground text-xs">
              (Prix vente − coût matière) / prix vente, une fois les achats renseignés.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
