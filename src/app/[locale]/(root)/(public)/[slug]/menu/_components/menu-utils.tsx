import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

// Interface pour un produit de menu avec ses détails
export interface MenuItemWithDetails {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category_id: string | null;
  category_name?: string;
}

// Fonction pour récupérer l'établissement par slug
export async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  try {
    console.log("🔍 Recherche de l'établissement avec le slug:", slug);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("establishments")
      .select(
        `
        id,
        name,
        slug,
        description,
        address,
        phone,
        email,
        logo_url,
        cover_image_url,
        website,
        is_public,
        created_at,
        updated_at,
        deleted
      `,
      )
      .eq("slug", slug)
      .eq("deleted", false)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération de l'établissement:", error);
      return null;
    }

    // Vérifier si l'établissement est public
    if (!data.is_public) {
      console.log("🚫 Établissement non public:", data.name);
      return null;
    }

    console.log("✅ Établissement trouvé:", data.name);
    return data as Establishment;
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération de l'établissement:", error);
    return null;
  }
}

// Fonction pour récupérer le menu de l'établissement
export async function getEstablishmentMenu(establishmentId: string): Promise<{
  categories: { id: string; name: string; description?: string }[];
  itemsByCategory: Record<string, MenuItemWithDetails[]>;
}> {
  try {
    console.log("🔍 Récupération du menu pour l'établissement:", establishmentId);

    const supabase = createClient();

    // Récupérer les menus de l'établissement
    const { data: menus, error: menusError } = await supabase
      .from("menus")
      .select("id, name, description")
      .eq("establishment_id", establishmentId)
      .eq("deleted", false);

    if (menusError) {
      console.error("❌ Erreur lors de la récupération des menus:", menusError);
      return { categories: [], itemsByCategory: {} };
    }

    if (menus.length === 0) {
      console.log("⚠️ Aucun menu trouvé pour l'établissement");
      return { categories: [], itemsByCategory: {} };
    }

    // Récupérer les produits des menus
    const menuIds = menus.map((menu) => menu.id);
    const { data: menuProducts, error: menuProductsError } = await supabase
      .from("menus_products")
      .select(
        `
        id,
        menus_id,
        products_id,
        price,
        products (
          id,
          name,
          description
        )
      `,
      )
      .in("menus_id", menuIds)
      .eq("deleted", false);

    if (menuProductsError) {
      console.error("❌ Erreur lors de la récupération des produits:", menuProductsError);
      return { categories: [], itemsByCategory: {} };
    }

    // Catégorie par défaut
    const categories = [
      {
        id: "uncategorized",
        name: "Sans catégorie",
        description: "Produits sans catégorie spécifique",
      },
    ];

    // Organiser les produits
    const itemsByCategory: Record<string, MenuItemWithDetails[]> = {
      uncategorized: [],
    };

    menuProducts.forEach((menuProduct) => {
      if (!menuProduct.products) return;

      const product = menuProduct.products;
      const menuItem: MenuItemWithDetails = {
        id: menuProduct.id,
        name: product.name,
        description: product.description,
        price: menuProduct.price,
        category_id: "uncategorized",
        category_name: "Sans catégorie",
      };

      itemsByCategory.uncategorized.push(menuItem);
    });

    console.log("✅ Menu récupéré avec succès");
    return { categories, itemsByCategory };
  } catch (error) {
    console.error("💥 Erreur inattendue lors de la récupération du menu:", error);
    return { categories: [], itemsByCategory: {} };
  }
}
