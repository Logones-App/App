"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

// Hook pour les mutations des horaires d'ouverture
export function useOpeningHoursMutations(establishmentId: string) {
  const queryClient = useQueryClient();

  // Mutation pour ajouter une plage horaire
  const addMutation = useMutation({
    mutationFn: async (payload: {
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_active: boolean;
      organization_id: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("opening_hours").insert({
        establishment_id: establishmentId,
        organization_id: payload.organization_id,
        day_of_week: payload.day_of_week,
        open_time: payload.open_time,
        close_time: payload.close_time,
        is_active: payload.is_active,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-opening-hours", establishmentId] });
    },
  });

  // Mutation pour supprimer une plage horaire
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("opening_hours").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-opening-hours", establishmentId] });
    },
  });

  // Mutation pour mettre à jour une plage horaire
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { open_time: string; close_time: string; is_active: boolean };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("opening_hours")
        .update({
          open_time: payload.open_time,
          close_time: payload.close_time,
          is_active: payload.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-opening-hours", establishmentId] });
    },
  });

  return {
    addMutation,
    deleteMutation,
    updateMutation,
  };
}
