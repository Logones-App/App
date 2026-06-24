"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

interface UseMenusManagementProps {
  establishmentId: string;
  organizationId: string;
  menus: Tables<"menus">[] | undefined;
}

export function useMenusManagement({ establishmentId, organizationId, menus }: UseMenusManagementProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editMenu, setEditMenu] = useState<Tables<"menus"> | null>(null);
  const [deleteMenuId, setDeleteMenuId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addMenuMutation = useMutation({
    mutationFn: async (values: Partial<Tables<"menus">>) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").insert({
        ...values,
        organization_id: organizationId,
        establishment_id: establishmentId,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["establishment-menus"] });
      setShowMenuForm(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la création du menu."),
  });

  const editMenuMutation = useMutation({
    mutationFn: async ({ id, ...values }: Partial<Tables<"menus">> & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditMenu(null);
    },
  });

  const patchMenuMutation = useMutation({
    mutationFn: async ({ id, ...values }: Partial<Tables<"menus">> & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["establishment-menus"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour."),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteMenuId(null);
      setActiveMenuId(null);
    },
  });

  useEffect(() => {
    if (!activeMenuId && menus && menus.length > 0) {
      setActiveMenuId(menus[0].id);
    }
  }, [menus, activeMenuId]);

  const activeMenu = useMemo(() => menus?.find((m) => m.id === activeMenuId), [menus, activeMenuId]);

  return {
    activeMenuId,
    setActiveMenuId,
    showMenuForm,
    setShowMenuForm,
    editMenu,
    setEditMenu,
    deleteMenuId,
    setDeleteMenuId,
    activeMenu,
    addMenuMutation,
    editMenuMutation,
    deleteMenuMutation,
    patchMenuMutation,
  };
}
