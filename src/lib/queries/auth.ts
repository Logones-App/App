import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type UserRole = Database['public']['Tables']['users_roles']['Row'];

// Query pour récupérer l'utilisateur
export const useUser = () => {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['user'],
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

// Query pour récupérer les rôles
export const useUserRoles = (userId?: string) => {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('users_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      return data?.map((ur: { role: string }) => ur.role) || [];
    },
    enabled: !!userId,
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
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
};

// Mutation pour la déconnexion
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Nettoyer Zustand
      logout();
      
      // Nettoyer le cache
      queryClient.clear();
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
      organizationName 
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
          }
        }
      });

      if (error) throw error;

      // Créer l'organisation
      if (data.user) {
        const slug = organizationName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            slug: slug,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Ajouter l'utilisateur comme admin de l'organisation
        const { error: roleError } = await supabase
          .from('users_roles')
          .insert({
            user_id: data.user.id,
            role: 'org_admin',
            organization_id: orgData.id,
          });

        if (roleError) throw roleError;
      }

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);
      setLoading(false);

      return data;
    },
    onSuccess: () => {
      // Invalider les queries liées à l'utilisateur
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
}; 