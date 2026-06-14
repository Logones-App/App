import { ProductsContent } from "./_components/products-content";

export default function ProduitsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Catalogue produits</h1>
        <p className="text-muted-foreground text-sm">Gérez vos produits et services commercialisables</p>
      </div>
      <ProductsContent />
    </div>
  );
}
