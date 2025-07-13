import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

// Query pour récupérer les organisations de l'utilisateur
export const useUserOrganizations = (userId?: string) => {
  return useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('users_organizations')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            slug,
            description,
            logo_url,
            settings
          )
        `)
        .eq('user_id', userId)
        .eq('deleted', false);

      if (error) throw error;
      return data?.map((item: any) => item.organizations).filter(Boolean) || [];
    },
    enabled: !!userId,
  });
};

// Query pour récupérer une organisation spécifique
export const useOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .eq('deleted', false)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};

// Mutation pour créer une organisation
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organization: {
      name: string;
      slug: string;
      description?: string;
      logo_url?: string;
      settings?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert(organization)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalider les queries liées aux organisations
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });
};

// Mutation pour mettre à jour une organisation
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      logo_url?: string;
      settings?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux organisations
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.id] });
    },
  });
}; 