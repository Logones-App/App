import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionRow = Tables<"public_menu_sections">;
type ItemRow = Tables<"public_menu_items">;

export type PublicMenuItemWithProduct = ItemRow & {
  menus_product: {
    id: string;
    price: number | null;
    product: {
      id: string;
      name: string;
      description: string | null;
      allergens: unknown;
      labels: unknown;
      product_type: unknown;
      portion_unit: string | null;
      portion_weight: number | null;
      is_available: boolean | null;
    } | null;
  } | null;
};

export type PublicMenuSectionWithItems = SectionRow & {
  items: PublicMenuItemWithProduct[];
};

export type MenuProductPickerItem = {
  menusProductId: string;
  menuId: string;
  menuName: string | null;
  productId: string;
  productName: string;
  price: number | null;
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const publicMenuSectionsKey = (establishmentId: string, organizationId: string) =>
  ["public-menu-sections", establishmentId, organizationId] as const;

export const menuProductsPickerKey = (establishmentId: string, organizationId: string) =>
  ["menus-products-picker", establishmentId, organizationId] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePublicMenuSections(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: publicMenuSectionsKey(establishmentId, organizationId),
    queryFn: async (): Promise<PublicMenuSectionWithItems[]> => {
      const supabase = createClient();

      const { data: sections, error: secError } = await supabase
        .from("public_menu_sections")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (secError) throw secError;
      if (!sections?.length) return [];

      const sectionIds = sections.map((s) => s.id);

      const { data: items, error: itemError } = await supabase
        .from("public_menu_items")
        .select(
          `*, menus_product:menus_products(
            id, price,
            product:products(id, name, description, allergens, labels, product_type, portion_unit, portion_weight, is_available)
          )`,
        )
        .in("section_id", sectionIds)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (itemError) throw itemError;

      const itemsBySection = new Map<string, PublicMenuItemWithProduct[]>();
      for (const item of (items ?? []) as PublicMenuItemWithProduct[]) {
        const list = itemsBySection.get(item.section_id) ?? [];
        list.push(item);
        itemsBySection.set(item.section_id, list);
      }

      return sections.map((s) => ({ ...s, items: itemsBySection.get(s.id) ?? [] }));
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

export function useMenuProductsPicker(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: menuProductsPickerKey(establishmentId, organizationId),
    queryFn: async (): Promise<MenuProductPickerItem[]> => {
      const supabase = createClient();

      const { data: menus, error: menuError } = await supabase
        .from("menus")
        .select("id, name")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (menuError) throw menuError;
      if (!menus?.length) return [];

      const menuIds = menus.map((m) => m.id);
      const menuNameById = new Map(menus.map((m) => [m.id, m.name]));

      const { data: mps, error: mpError } = await supabase
        .from("menus_products")
        .select("id, price, menus_id, products_id, product:products(id, name)")
        .in("menus_id", menuIds)
        .eq("deleted", false)
        .order("id", { ascending: true });

      if (mpError) throw mpError;

      return (mps ?? [])
        .filter((mp) => mp.product != null && mp.menus_id != null)
        .map((mp) => {
          const product = mp.product as { id: string; name: string };
          return {
            menusProductId: mp.id,
            menuId: mp.menus_id!,
            menuName: menuNameById.get(mp.menus_id!) ?? null,
            productId: product.id,
            productName: product.name,
            price: mp.price,
          };
        });
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

// ─── Section mutations ────────────────────────────────────────────────────────

export function useCreateSection(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, parentId = null }: { name: string; parentId?: string | null }) => {
      const supabase = createClient();
      const existing =
        queryClient.getQueryData<PublicMenuSectionWithItems[]>(
          publicMenuSectionsKey(establishmentId, organizationId),
        ) ?? [];
      // display_order au sein du même parent (racine ou sous-section).
      const display_order = existing.filter((s) => s.parent_id === parentId).length;
      const { data, error } = await supabase
        .from("public_menu_sections")
        .insert({
          name,
          establishment_id: establishmentId,
          organization_id: organizationId,
          display_order,
          parent_id: parentId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de créer la section."),
  });
}

export function useUpdateSection(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; description?: string | null } }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("public_menu_sections")
        .update(patch)
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de mettre à jour la section."),
  });
}

export function useUpdateItemNote(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("public_menu_items")
        .update({ note })
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de sauvegarder la note."),
  });
}

export function useDeleteSection(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // Supprime la section ET ses sous-sections directes (soft-delete ; le CASCADE SQL
      // ne s'applique qu'au hard-delete). Les items des sous-sections deviennent naturellement
      // invisibles (leur section n'est plus dans la liste des sections non supprimées).
      const { error } = await supabase
        .from("public_menu_sections")
        .update({ deleted: true })
        .or(`id.eq.${id},parent_id.eq.${id}`)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de supprimer la section."),
  });
}

export function useMoveSection(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const all =
        queryClient.getQueryData<PublicMenuSectionWithItems[]>(
          publicMenuSectionsKey(establishmentId, organizationId),
        ) ?? [];
      const target = all.find((s) => s.id === id);
      if (!target) return;
      // Réordonner uniquement au sein du même parent (frères).
      const sections = all.filter((s) => s.parent_id === target.parent_id);
      const idx = sections.findIndex((s) => s.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return;

      const a = sections[idx];
      const b = sections[swapIdx];
      const supabase = createClient();
      const [r1, r2] = await Promise.all([
        supabase.from("public_menu_sections").update({ display_order: b.display_order }).eq("id", a.id),
        supabase.from("public_menu_sections").update({ display_order: a.display_order }).eq("id", b.id),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de déplacer la section."),
  });
}

// ─── Item mutations ───────────────────────────────────────────────────────────

export function useAddPublicMenuItem(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ section_id, menus_product_id }: { section_id: string; menus_product_id: string }) => {
      const sections =
        queryClient.getQueryData<PublicMenuSectionWithItems[]>(
          publicMenuSectionsKey(establishmentId, organizationId),
        ) ?? [];
      const section = sections.find((s) => s.id === section_id);
      const display_order = section?.items.length ?? 0;
      const supabase = createClient();
      const { error } = await supabase
        .from("public_menu_items")
        .insert({ section_id, menus_product_id, organization_id: organizationId, display_order });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible d'ajouter le produit."),
  });
}

export function useRemovePublicMenuItem(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("public_menu_items")
        .update({ deleted: true })
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de supprimer le produit."),
  });
}

export function useTogglePublicMenuItemVisibility(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("public_menu_items")
        .update({ is_visible })
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de modifier la visibilité."),
  });
}

export function useMovePublicMenuItem(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, section_id, direction }: { id: string; section_id: string; direction: "up" | "down" }) => {
      const sections =
        queryClient.getQueryData<PublicMenuSectionWithItems[]>(
          publicMenuSectionsKey(establishmentId, organizationId),
        ) ?? [];
      const section = sections.find((s) => s.id === section_id);
      if (!section) return;
      const items = section.items;
      const idx = items.findIndex((i) => i.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;

      const a = items[idx];
      const b = items[swapIdx];
      const supabase = createClient();
      const [r1, r2] = await Promise.all([
        supabase.from("public_menu_items").update({ display_order: b.display_order }).eq("id", a.id),
        supabase.from("public_menu_items").update({ display_order: a.display_order }).eq("id", b.id),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicMenuSectionsKey(establishmentId, organizationId) });
    },
    onError: () => toast.error("Impossible de déplacer le produit."),
  });
}
