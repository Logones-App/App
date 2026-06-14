import { AdminProductsContent } from "./_components/admin-products-content";

export default function AdminCrmProduitsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Catalogue produits CRM</h1>
        <p className="text-muted-foreground text-sm">
          Gérez les produits et services proposés par les commerciaux dans leurs devis
        </p>
      </div>
      <AdminProductsContent />
    </div>
  );
}
