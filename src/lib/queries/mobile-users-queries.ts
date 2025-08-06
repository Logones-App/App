import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";



// Query pour récupérer tous les utilisateurs mobile d'un établissement
export function useMobileUsers(establishmentId: string) {
  return useQuery({
    queryKey: ["mobile-users", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false) // Exclure les utilisateurs supprimés
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      console.log("Mobile users data:", data); // Debug
      return data;
    },
    enabled: !!establishmentId,
  });
}

// Query pour récupérer un utilisateur mobile spécifique
export function useMobileUser(id: string) {
  return useQuery({
    queryKey: ["mobile-user", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
} 