import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type Establishment = Database['public']['Tables']['establishments']['Row'];

// Query pour récupérer les établissements d'une organisation
export const useOrganizationEstablishments = (organizationId?: string) => {
  return useQuery({
    queryKey: ['organization-establishments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('deleted', false)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
};

// Query pour récupérer un établissement spécifique
export const useEstablishment = (establishmentId?: string) => {
  return useQuery({
    queryKey: ['establishment', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null;

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishmentId)
        .eq('deleted', false)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
};

// Query pour récupérer un établissement par slug
export const useEstablishmentBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ['establishment-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('slug', slug)
        .eq('deleted', false)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

// Mutation pour créer un établissement
export const useCreateEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishment: {
      name: string;
      slug: string;
      organization_id: string;
      user_id: string;
      description?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo_url?: string;
      cover_image_url?: string;
      seo_title?: string;
      seo_description?: string;
      is_public?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('establishments')
        .insert(establishment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux établissements
      queryClient.invalidateQueries({ 
        queryKey: ['organization-establishments', data.organization_id] 
      });
    },
  });
};

// Mutation pour mettre à jour un établissement
export const useUpdateEstablishment = () => {
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
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo_url?: string;
      cover_image_url?: string;
      seo_title?: string;
      seo_description?: string;
      is_public?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('establishments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux établissements
      queryClient.invalidateQueries({ 
        queryKey: ['organization-establishments', data.organization_id] 
      });
      queryClient.invalidateQueries({ queryKey: ['establishment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['establishment-by-slug', data.slug] });
    },
  });
}; 