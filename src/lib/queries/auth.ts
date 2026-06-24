import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

// Query pour récupérer l'utilisateur
export const useUser = () => {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(user);
      setLoading(false);

      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Query pour récupérer le rôle principal de l'utilisateur
export const useUserMainRole = (userId?: string) => {
  const { setUserRole, setCurrentOrganization } = useAuthStore();

  return useQuery({
    queryKey: ["user-main-role", userId],
    queryFn: async () => {
      if (!userId) return null;

      try {
        // Solution principale : utiliser l'API route
        console.log("🔍 Récupération des rôles via API...");

        const response = await fetch("/api/auth/roles", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Important pour inclure les cookies
        });

        console.log("🔍 API response status:", response.status);
        console.log("🔍 API response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          console.error("❌ API response not ok:", response.status, response.statusText);

          // Essayer de lire le contenu de la réponse pour le diagnostic
          const errorText = await response.text();
          console.error("❌ API error content:", errorText);

          return null;
        }

        const data = await response.json();
        console.log("🔍 API response data:", data);

        if (data.role === "system_admin") {
          console.log("✅ System admin trouvé via API!");
          setUserRole("system_admin");
          setCurrentOrganization(null);
          return { role: "system_admin", organizationId: null };
        }

        if (data.role === "org_admin") {
          console.log("✅ Org admin trouvé via API!");
          setUserRole("org_admin");
          setCurrentOrganization(data.organization);
          return {
            role: "org_admin",
            organizationId: data.organizationId,
            organization: data.organization,
          };
        }

        console.log("⚠️ Aucun rôle trouvé via API");
        return null;
      } catch (error) {
        console.error("❌ Error:", error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 0,
  });
};

// Query pour récupérer toutes les organisations (system_admin uniquement)
export const useAllOrganizations = () => {
  const { userRole } = useAuthStore();

  return useQuery({
    queryKey: ["all-organizations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("organizations").select("*").eq("deleted", false).order("name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: userRole === "system_admin",
  });
};

// Mutation pour la connexion
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: () => {
      // Invalider les queries liées à l'utilisateur
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
  });
};

// Mutation pour la déconnexion
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // 1. Déconnexion côté client Supabase
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Déconnexion côté serveur via API
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la déconnexion côté serveur");
      }

      return { success: true };
    },
    onSuccess: () => {
      // 3. Nettoyer Zustand
      logout();

      // 4. Nettoyer le cache TanStack Query
      queryClient.clear();

      // 5. Nettoyer le localStorage (établissement sélectionné)
      if (typeof window !== "undefined") {
        localStorage.removeItem("current-establishment");
        window.location.href = "/fr/auth/login";
      }
    },
    onError: (error) => {
      console.error("Erreur lors de la déconnexion:", error);
      logout();
      queryClient.clear();
      if (typeof window !== "undefined") {
        localStorage.removeItem("current-establishment");
        window.location.href = "/fr/auth/login";
      }
    },
  });
};

// Mutation pour l'inscription
export const useRegister = () => {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
      organizationName,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    }) => {
      const supabase = createClient();

      // Créer l'utilisateur
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      // Créer l'organisation
      if (data.user) {
        const slug = organizationName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: organizationName,
            slug: slug,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Ajouter l'utilisateur à l'organisation dans users_organizations
        const { error: orgLinkError } = await supabase.from("users_organizations").insert({
          user_id: data.user.id,
          organization_id: orgData.id,
        });

        if (orgLinkError) throw orgLinkError;
      }

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: () => {
      // Invalider les queries liées à l'utilisateur
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
  });
};
