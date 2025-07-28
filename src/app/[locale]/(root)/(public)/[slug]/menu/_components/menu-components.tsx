import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

type MenuProduct = Tables<"menus_products">;
type Menu = Tables<"menus">;
type Product = Tables<"products">;

// Interface pour un produit de menu avec ses détails
interface MenuItemWithDetails {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category_id: string | null;
  category_name?: string;
}

// Composant pour afficher un élément de menu
export function MenuItemCard({ item }: { item: MenuItemWithDetails }) {
  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="mt-2 text-sm text-gray-600">{item.description}</CardDescription>
            )}
          </div>
          {item.price && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {item.price.toFixed(2)} €
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.category_name && (
          <div className="mt-2">
            <p className="text-muted-foreground text-xs">
              <strong>Catégorie :</strong> {item.category_name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Composant pour afficher une catégorie de menu
export function MenuCategorySection({
  category,
  items,
}: {
  category: { id: string; name: string; description?: string };
  items: MenuItemWithDetails[];
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
        {category.description && <p className="text-muted-foreground mt-1">{category.description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// Composant pour afficher le menu complet
export function MenuDisplay({
  categories,
  itemsByCategory,
}: {
  categories: { id: string; name: string; description?: string }[];
  itemsByCategory: Record<string, MenuItemWithDetails[]>;
}) {
  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const items = itemsByCategory[category.id] ?? [];
        if (items.length === 0) return null;

        return <MenuCategorySection key={category.id} category={category} items={items} />;
      })}
    </div>
  );
}
