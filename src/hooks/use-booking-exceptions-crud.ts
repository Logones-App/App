import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface CreateBookingExceptionData {
  establishment_id: string;
  organization_id: string;
  exception_type: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
}

interface UpdateBookingExceptionData {
  exception_type?: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
}

// Mutation pour créer une exception
export const useCreateBookingException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBookingExceptionData) => {
      const supabase = createClient();
      const { data: newException, error } = await supabase
        .from("booking_exceptions")
        .insert({
          ...data,
          status: data.status ?? "active",
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Exception créée:", newException);
      return newException;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux exceptions
      queryClient.invalidateQueries({ queryKey: ["booking-exceptions", data.establishment_id] });
      queryClient.invalidateQueries({ queryKey: ["booking-exceptions"] });
    },
  });
};

// Mutation pour mettre à jour une exception
export const useUpdateBookingException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateBookingExceptionData) => {
      const supabase = createClient();
      const { data: updatedException, error } = await supabase
        .from("booking_exceptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Exception modifiée:", updatedException);
      return updatedException;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux exceptions
      queryClient.invalidateQueries({ queryKey: ["booking-exceptions", data.establishment_id] });
      queryClient.invalidateQueries({ queryKey: ["booking-exceptions"] });
    },
  });
};

// Mutation pour supprimer une exception
export const useDeleteBookingException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("booking_exceptions").delete().eq("id", id);

      if (error) throw error;

      console.log("✅ Exception supprimée");
      return { id };
    },
    onSuccess: () => {
      // Invalider les queries liées aux exceptions
      queryClient.invalidateQueries({ queryKey: ["booking-exceptions"] });
    },
  });
};
