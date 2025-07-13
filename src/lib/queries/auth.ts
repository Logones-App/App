import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, createServiceClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type UserRole = Database['public']['Tables']['users_roles']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

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
        .select('role, organization_id')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

// Fonction pour créer un system_admin automatiquement
const createSystemAdmin = async (userId: string) => {
  try {
    console.log("Création automatique d'un system_admin pour:", userId);
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('users_roles')
      .insert({
        user_id: userId,
        role: 'system_admin'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Erreur création system_admin:", error);
      return null;
    }
    
    console.log("System_admin créé avec succès:", data);
    return { role: 'system_admin', organizationId: null };
  } catch (error) {
    console.error("Erreur lors de la création system_admin:", error);
    return null;
  }
};

// Query pour récupérer le rôle principal de l'utilisateur
export const useUserMainRole = (userId?: string) => {
  const { setUserRole, setCurrentOrganization } = useAuthStore();
  
  return useQuery({
    queryKey: ['user-main-role', userId],
    queryFn: async () => {
      if (!userId) return null;

      try {
        const response = await fetch('/api/auth/roles');
        const data = await response.json();
        
        if (data.role === 'system_admin') {
          setUserRole('system_admin');
          setCurrentOrganization(null);
          return { role: 'system_admin', organizationId: null };
        }
        
        if (data.role === 'org_admin') {
          setUserRole('org_admin');
          setCurrentOrganization(data.organization);
          return { 
            role: 'org_admin', 
            organizationId: data.organizationId,
            organization: data.organization
          };
        }
        
        return null;
        
      } catch (error) {
        console.error("Erreur lors de l'appel API roles:", error);
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
    queryKey: ['all-organizations'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('deleted', false)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: userRole === 'system_admin',
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

        // Ajouter l'utilisateur comme org_admin dans users_roles
        const { error: roleError } = await supabase
          .from('users_roles')
          .insert({
            user_id: data.user.id,
            role: 'org_admin'
          });

        if (roleError) throw roleError;

        // Ajouter l'utilisateur à l'organisation dans users_organizations
        const { error: orgLinkError } = await supabase
          .from('users_organizations')
          .insert({
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
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
}; 