"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

export type SupplierRow = Tables<"suppliers">;
export type SupplierWithCount = SupplierRow & { productCount: number };
export type SupplierReferenceRow = Tables<"supplier_references">;
export type SupplierReferenceInsert = TablesInsert<"supplier_references">;
export type SupplierInsert = TablesInsert<"suppliers">;

export function supplierQueryKey(organizationId: string) {
  return ["suppliers", organizationId] as const;
}

export function supplierDetailQueryKey(supplierId: string) {
  return ["supplier", supplierId] as const;
}

export function supplierReferenceQueryKey(productId: string) {
  return ["supplier-references", productId] as const;
}

export function supplierProductsQueryKey(supplierId: string) {
  return ["supplier-products", supplierId] as const;
}

// ─── Fournisseurs org ─────────────────────────────────────────────────────────

export function useSuppliers(organizationId: string) {
  return useQuery({
    queryKey: supplierQueryKey(organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, supplier_references(count)")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .eq("supplier_references.deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        productCount: (s.supplier_references as unknown as { count: number }[])[0]?.count ?? 0,
      })) as SupplierWithCount[];
    },
    enabled: !!organizationId,
  });
}

export function useActiveSuppliers(organizationId: string) {
  const { data: all = [], ...rest } = useSuppliers(organizationId);
  return { data: all.filter((s) => s.is_active), ...rest };
}

export function useCreateSupplier(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<SupplierInsert, "organization_id">) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...values, organization_id: organizationId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      toast.success("Fournisseur créé");
      void queryClient.invalidateQueries({ queryKey: supplierQueryKey(organizationId) });
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useUpdateSupplier(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"suppliers"> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("suppliers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fournisseur mis à jour");
      void queryClient.invalidateQueries({ queryKey: supplierQueryKey(organizationId) });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteSupplier(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error: refErr } = await supabase
        .from("supplier_references")
        .update({ deleted: true })
        .eq("supplier_id", id)
        .eq("deleted", false);
      if (refErr) throw refErr;
      const { error } = await supabase.from("suppliers").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fournisseur supprimé");
      void queryClient.invalidateQueries({ queryKey: supplierQueryKey(organizationId) });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

// ─── Références fournisseur par produit ──────────────────────────────────────

export function useSupplierReferences(productId: string) {
  return useQuery({
    queryKey: supplierReferenceQueryKey(productId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_references")
        .select("*, supplier:suppliers(id, name, is_active)")
        .eq("product_id", productId)
        .eq("deleted", false)
        .order("is_preferred", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (SupplierReferenceRow & {
        supplier: { id: string; name: string; is_active: boolean } | null;
      })[];
    },
    enabled: !!productId,
  });
}

export function useCreateSupplierReference(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<SupplierReferenceInsert, "product_id">) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_references")
        .insert({ ...values, product_id: productId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      toast.success("Fournisseur associé");
      void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'association"),
  });
}

export function useUpdateSupplierReference(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"supplier_references"> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("supplier_references").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteSupplierReference(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("supplier_references").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Association supprimée");
      void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

// ─── Catalogue achats (toutes les références d'une org) ──────────────────────

export type CatalogReferenceRow = SupplierReferenceRow & {
  product: { id: string; name: string } | null;
  supplier: { id: string; name: string; is_active: boolean } | null;
};

export function allSupplierReferencesQueryKey(organizationId: string) {
  return ["all-supplier-references", organizationId] as const;
}

export function useAllSupplierReferences(organizationId: string) {
  return useQuery({
    queryKey: allSupplierReferencesQueryKey(organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_references")
        .select("*, product:products(id, name), supplier:suppliers(id, name, is_active)")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogReferenceRow[];
    },
    enabled: !!organizationId,
  });
}

// ─── Fournisseur détail + ses produits ────────────────────────────────────────

export function useSupplier(supplierId: string) {
  return useQuery({
    queryKey: supplierDetailQueryKey(supplierId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("suppliers").select("*").eq("id", supplierId).single();
      if (error) throw error;
      return data as SupplierRow;
    },
    enabled: !!supplierId,
  });
}

export type SupplierProductRow = SupplierReferenceRow & {
  product: {
    id: string;
    name: string;
    description: string | null;
    category_id: string | null;
  } | null;
};

export function useSupplierProducts(supplierId: string) {
  return useQuery({
    queryKey: supplierProductsQueryKey(supplierId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_references")
        .select("*, product:products(id, name, description, category_id)")
        .eq("supplier_id", supplierId)
        .eq("deleted", false)
        .order("is_preferred", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupplierProductRow[];
    },
    enabled: !!supplierId,
  });
}
