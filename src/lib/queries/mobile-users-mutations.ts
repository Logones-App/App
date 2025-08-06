import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/database.types";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];
type MobileUserInsert = Database["public"]["Tables"]["mobile_users"]["Insert"];
type MobileUserUpdate = Database["public"]["Tables"]["mobile_users"]["Update"];

// Mutation pour créer un utilisateur mobile
export function useCreateMobileUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData: MobileUserInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("mobile_users")
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["mobile-users"] });
      toast.success("Utilisateur mobile créé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création de l&apos;utilisateur");
      console.error(error);
    },
  });
}

// Mutation pour mettre à jour un utilisateur mobile
export function useUpdateMobileUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MobileUserUpdate }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("mobile_users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["mobile-users"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-user", variables.id] });
      toast.success("Utilisateur mobile mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour de l&apos;utilisateur");
      console.error(error);
    },
  });
}

// Mutation pour supprimer un utilisateur mobile
export function useDeleteMobileUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("mobile_users")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["mobile-users"] });
      toast.success("Utilisateur mobile supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression de l&apos;utilisateur");
      console.error(error);
    },
  });
} 